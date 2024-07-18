function Firmware_Get(NodeID)
{
	dev.nid(NodeID)
	var StrLen = dev.r(260)
	
	if(StrLen > 0)
	{
		var Str = ""
		for (var i = 0; i < StrLen / 2; i++)
		{
			var Word = dev.r(261 + i)
			Str = Str.concat(String.fromCharCode(Word >> 8))
			Str = Str.concat(String.fromCharCode(Word & 0xFF))
		}
		var str_arr = Str.split(",")
		
		// branch, commit, commitTimestamp, project
		return [str_arr[2], str_arr[0], str_arr[1], str_arr[3]]
	}
}

function Firmware_Update(NodeID, FileName)
{
	dev.nid(NodeID)
}

function Firmware_LoadAnyFile(FileName)
{
	var BinArray = loadbin(FileName)
	
	// STM32
	if(BinArray[0] == 0x00 && BinArray[1] == 0x80 && BinArray[2] == 0x00 && BinArray[3] == 0x20)
		return BinArray
	
	// TMS
	else if(BinArray[0] == 0x02 && BinArray[BinArray.length - 1] == 0x03)
	{
		var OutStr = ""
		for(var i = 3; i < BinArray.length - 4; i++)
			OutStr += String.fromCharCode(BinArray[i])
		
		return OutStr.replace(/\$A/g, "").split(/[\s, ]+/)
	}
}

function Firmware_TMS(FileName)
{
	var fl_array = Firmware_LoadAnyFile(FileName)
	if(!fl_array)
	{
		print("File load error")
		return
	}
	
	var VAL_REGEXP = RegExp("^[0-9a-fA-F]{2}$")
	var BLOCK_SIZE = 300		// Write buffer size
	var ArrayIndex = 0			// Current array index
	var WriteBuffer = []		// Transmit buffer
	var Progress = 0			// For progress display
	var XOR = 0					// XOR checksum
	var Build16Trigger = 0		// Trigger for building 16bit values
	var Build16Data = 0			// 16bit value
	var Num16bParts = 0			// Number of uncompleted 16bit parts
	
	// reset device
	dev.c(320)
	sleep(500)
	
	print("Erasing SECTOR C...")
	dev.c(302)
	print("Erasing SECTOR D...")
	dev.c(303)
	
	// reset counters
	sleep(100)
	dev.c(308)
	
	print("Writing data...")
	while (ArrayIndex < fl_array.length)
	{		
		if (VAL_REGEXP.test(fl_array[ArrayIndex]))
		{
			// [data element]
			
			var curVal = parseInt(fl_array[ArrayIndex], 16)
			
			// display progress
			if (ArrayIndex > ((fl_array.length / 10) * Progress))
			{
				print((Progress * 10) + "%")
				Progress++
			}
			
			// fill block buffer
			if (WriteBuffer.length < BLOCK_SIZE)
			{
				if (Build16Trigger == 0)
				{
					Build16Data = curVal << 8
					Build16Trigger = 1
				}
				else
				{
					Build16Data |= curVal
					Build16Trigger = 0
					XOR ^= Build16Data
					WriteBuffer.push(Build16Data)
				}
				
				// only after processing value
				ArrayIndex++
			}
			else
			{
				// write to processor
				dev.wa(1, WriteBuffer)
				dev.c(310)
				
				// reset buffer
				WriteBuffer = []
			}
		}
		else
		{
			// [address element]
			
			if (WriteBuffer.length > 0)
			{
				// write to processor
				dev.wa(1, WriteBuffer)
				dev.c(310)
				
				// for uncompleted operation
				if (Build16Trigger) Num16bParts++
				Build16Trigger = 0
				
				// reset buffer
				WriteBuffer = []
			}
			
			// set address
			var curAddr = parseInt(fl_array[ArrayIndex], 16)
			ArrayIndex++
			
			dev.w(2, curAddr & 0xffff)				// low part
			dev.w(3, (curAddr >> 16) & 0xffff)		// high part
			dev.c(309)
			
			XOR ^= curAddr & 0xffff
			XOR ^= (curAddr >> 16) & 0xffff
		}
	}
	
	if (WriteBuffer.length > 0)
	{
		// write to processor
		dev.wa(1, WriteBuffer)
		dev.c(310)
		
		// reset buffer
		WriteBuffer = []
	}
	
	// diag output
	if (Num16bParts)
		print("Number of uncompleted words: " + Num16bParts)
	
	// compare XOR values
	if (XOR == dev.r(10))
	{
		print("100%")
		print("Checksum OK")
		
		dev.w(4, XOR)
		dev.c(311)
		
		print("Firmware update completed")
		return true
	}
	else
	{
		print("Checksum missmatch, process aborted")
	}
}

function Firmware_STM32(FileName)
{
	// Команды
	var ACT_DEVICE_RESET = 320				// Команда перезапуска процессора
	var ACT_FLASH_ERASE = 300				// Команда на очистку FLASH памяти процессора
	var ACT_ALL_VARIABLES_RESET = 301		// Очитска всех переменных
	var ACT_PROGRAMM_DATA = 302				// Команда на запись данных во FLASH память процессора
	var ACT_CRC_CHECK_AND_RESET = 303		// Проверить CRC MCU и PC и перезагрузить процессор

	// Адреса регистров
	var REG_BYTE_NUM = 2					// Регистр количества байт
	var REG_XOR_PC = 3						// Регистр контрольной суммы PC
	var REG_XOR_MCU = 10					// Регистр контрольной суммы MCU

	var fl_array = Firmware_LoadAnyFile(FileName)
	if(!fl_array)
	{
		print("File load error")
		return
	}
	
	var LocalIndex = 0						// Текущий индекс блока записываемых данных
	var BLOCK_SIZE = 512					// Количество записываемых данных
	var ArrayIndex = 0						// Текущий индекс массива
	var Word_H = 0							// Старшая часть слова ячейки памяти
	var Word_L = 0							// Младшая часть слова ячейки памяти
	var WriteBuffer = []					// Буфер передачи
	var Progress = 0						// Процесс программирования (проценты на экране)
	var XOR = 0								// XOR контрольная сумма

	print("Device reset.")
	dev.c(ACT_DEVICE_RESET)
	sleep(2000)

	print("Erasing memory...")
	dev.c(ACT_FLASH_ERASE)
	print("The memory has been cleared!")

	dev.c(ACT_ALL_VARIABLES_RESET)
	while (ArrayIndex < fl_array.length)
	{
		// Отображение процесса на экране
		if (ArrayIndex > ((fl_array.length / 10) * Progress))
		{
			print((Progress * 10) + "%")
			Progress++
		}
		
		// Отправка блока
		if ((fl_array.length - ArrayIndex) >= BLOCK_SIZE * 2)
		{
			while (LocalIndex < BLOCK_SIZE)
			{
				Word_L = fl_array[ArrayIndex] << 8
				Word_L |= fl_array[ArrayIndex + 1]

				Word_H = fl_array[ArrayIndex + 2] << 8
				Word_H |= fl_array[ArrayIndex + 3]

				WriteBuffer[LocalIndex] = Word_L
				WriteBuffer[LocalIndex + 1] = Word_H

				XOR ^= WriteBuffer[LocalIndex]
				XOR ^= WriteBuffer[LocalIndex + 1]

				ArrayIndex += 4
				LocalIndex += 2
			}
			dev.w(REG_BYTE_NUM, LocalIndex)		// Передача количество байт
			dev.wa(1, WriteBuffer)				// Передача данных
			dev.c(ACT_PROGRAMM_DATA)			// Отправка команды на запись данных во FLASH память процессора
			LocalIndex = 0
		}
		// Передача оставшихся байт
		else
		{
			WriteBuffer = []
			
			while (ArrayIndex < fl_array.length)
			{
				Word_L = fl_array[ArrayIndex] << 8
				Word_L |= fl_array[ArrayIndex + 1]

				Word_H = fl_array[ArrayIndex + 2] << 8
				Word_H |= fl_array[ArrayIndex + 3]

				WriteBuffer[LocalIndex] = Word_L
				WriteBuffer[LocalIndex + 1] = Word_H

				XOR ^= WriteBuffer[LocalIndex]
				XOR ^= WriteBuffer[LocalIndex + 1]

				ArrayIndex += 4
				LocalIndex += 2
			}

			dev.w(REG_BYTE_NUM, LocalIndex)
			dev.wa(1, WriteBuffer)
			dev.c(ACT_PROGRAMM_DATA)
			LocalIndex = 0
		}
	}

	// Если контрольные суммы PC и MCU совпали, то
	// процесс перепрограммирования прошел успешно
	if (XOR == dev.r(REG_XOR_MCU))
	{
		print("100%")
		print("Checksum OK")
		dev.w(REG_XOR_PC, XOR)
		dev.c(ACT_CRC_CHECK_AND_RESET)
		return true
	}
	else
	{
		print("Checksum missmatch, process aborted")
		print("CRC PC = " + XOR)
		print("CRC MCU = " + dev.r(REG_XOR_MCU))

		print("Erasing memory...")
		dev.c(ACT_FLASH_ERASE)
		print("The memory has been cleared!")
	}
}
