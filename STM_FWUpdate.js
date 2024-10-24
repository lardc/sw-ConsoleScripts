﻿include("PrintStatus.js")

const DeviceNameList = 
{
	100: ['PMXU', 'PMXUControlBoard'],
	101: ['MXU', 'MXUControlBoard'],
}
//------------------------

function FWU(CAN_ID)
{
	(CAN_ID) ? dev.nid(CAN_ID) : dev.nid(0);
	
	DeviceId = dev.r(258);
	
	if(DeviceNameList[DeviceId])
	{
		if(FWU_Print(DeviceId))
		{
			FWUpdateSTM("../../hw-" + DeviceNameList[DeviceId][1] + "/Firmware/Release/" + DeviceNameList[DeviceId][1] + ".binary")
			sleep(1000)
			p("")
			PrintFWInfo()
		}
	}
	else
		p('Unknown device (ID = ' + DeviceId + ')');
}
//------------------------

function Dump(CAN_ID)
{
	(CAN_ID) ? dev.nid(CAN_ID) : dev.nid(0);
	
	DeviceId = dev.r(258);
	
	if(DeviceNameList[DeviceId])
	{
		dev.Dump("../../hw-" + DeviceNameList[DeviceId][1] + "/Firmware/" + DeviceNameList[DeviceId][1] + ".regdump", 0, 126);
		p("The path to the regdump file is: " + "../../hw-" + DeviceNameList[DeviceId][1] + "/Firmware/" + DeviceNameList[DeviceId][1] + ".regdump");
	}
	else
		p('Unknown device (ID = ' + DeviceId + ')');
}
//------------------------

function Restore(CAN_ID)
{
	(CAN_ID) ? dev.nid(CAN_ID) : dev.nid(0);
	
	DeviceId = dev.r(258);
	
	if(DeviceNameList[DeviceId])
	{
		dev.Restore("../../hw-" + DeviceNameList[DeviceId][1] + "/Firmware/" + DeviceNameList[DeviceId][1] + ".regdump");
		p("Done")
	}
	else
		p('Unknown device (ID = ' + DeviceId + ')');
}
//------------------------

function FWU_Print(DeviceId)
{
	PrintFWInfo()
	p("")
	print("Confirm execution pressing 'y' to update the firmware in the " + DeviceNameList[DeviceId][0] + ", or exit by pressing 'n'");
	var key = 0;
	do
	{
		key = readkey();
	}
	while (key != "y" && key != "n")
		
	return (key == "y") ? true : false;
}
//------------------------

function FWUpdateSTM(FileName, Print)
{
	if(Print)
	{
		print("Current node id equal " + dev.GetNodeID() + ". Confirm execution pressing 'y' or exit pressing 'n'.");
		var key = 0;
		do
		{
			key = readkey();
		}
		while (key != "y" && key != "n")
		
		if (key == "n")
		{
			print("Exit.");
			return;
		}
	}
	
	// Команды
	var ACT_DEVICE_RESET = 320;				// Команда перезапуска процессора
	var ACT_FLASH_ERASE = 300;				// Команда на очистку FLASH памяти процессора
	var ACT_ALL_VARIABLES_RESET = 301;		// Очитска всех переменных
	var ACT_PROGRAMM_DATA = 302;			// Команда на запись данных во FLASH память процессора
	var ACT_CRC_CHECK_AND_RESET = 303;		// Проверить CRC MCU и PC и перезагрузить процессор

	// Адреса регистров
	var REG_BYTE_NUM = 2;					// Регистр количества байт
	var REG_XOR_PC = 3;						// Регистр контрольной суммы PC
	var REG_XOR_MCU = 10;					// Регистр контрольной суммы MCU

	var fl_array = loadbin(FileName);
	var LocalIndex = 0;						// Текущий индекс блока записываемых данных
	var BLOCK_SIZE = 512;					// Количество записываемых данных
	var ArrayIndex = 0;						// Текущий индекс массива
	var Word_H = 0;							// Старшая часть слова ячейки памяти
	var Word_L = 0;							// Младшая часть слова ячейки памяти
	var WriteBuffer = [];					// Буфер передачи
	var Progress = 0;						// Процесс программирования (проценты на экране)
	var XOR = 0;							// XOR контрольная сумма

	print("Device reset.");
	dev.c(ACT_DEVICE_RESET);
	sleep(2000);
	//
	print("Erasing memory...");
	dev.c(ACT_FLASH_ERASE);
	print("The memory has been cleared!");
	//
	dev.c(ACT_ALL_VARIABLES_RESET);

	while (ArrayIndex < fl_array.length)
	{

		// Отображение процесса на экране
		if (ArrayIndex > ((fl_array.length / 10) * Progress))
		{
			print((Progress * 10) + "%");
			Progress++;
		}
		//

		// Отправка блока
		if ((fl_array.length - ArrayIndex) >= BLOCK_SIZE * 2)
		{
			while (LocalIndex < BLOCK_SIZE)
			{
				Word_L = fl_array[ArrayIndex] << 8;
				Word_L |= fl_array[ArrayIndex + 1];

				Word_H = fl_array[ArrayIndex + 2] << 8;
				Word_H |= fl_array[ArrayIndex + 3];

				WriteBuffer[LocalIndex] = Word_L;
				WriteBuffer[LocalIndex + 1] = Word_H;

				XOR ^= WriteBuffer[LocalIndex];
				XOR ^= WriteBuffer[LocalIndex + 1];

				ArrayIndex += 4;
				LocalIndex += 2;
			}
			dev.w(REG_BYTE_NUM, LocalIndex);		// Передача количество байт
			dev.wa(1, WriteBuffer);					// Передача данных
			dev.c(ACT_PROGRAMM_DATA);				// Отправка команды на запись данных во FLASH память процессора
			LocalIndex = 0;
		}
		else // Передача оставшихся байт
		{
			WriteBuffer = [];
			
			while (ArrayIndex < fl_array.length)
			{
				Word_L = fl_array[ArrayIndex] << 8;
				Word_L |= fl_array[ArrayIndex + 1];

				Word_H = fl_array[ArrayIndex + 2] << 8;
				Word_H |= fl_array[ArrayIndex + 3];

				WriteBuffer[LocalIndex] = Word_L;
				WriteBuffer[LocalIndex + 1] = Word_H;

				XOR ^= WriteBuffer[LocalIndex];
				XOR ^= WriteBuffer[LocalIndex + 1];

				ArrayIndex += 4;
				LocalIndex += 2;
			}

			dev.w(REG_BYTE_NUM, LocalIndex);
			dev.wa(1, WriteBuffer);
			dev.c(ACT_PROGRAMM_DATA);
			LocalIndex = 0;
		}
	}

	// Если контрольные суммы PC и MCU совпали, то
	// процесс перепрограммирования прошел успешно
	if (XOR == dev.r(REG_XOR_MCU))
	{
		print("100%");
		print("Checksum OK");
		dev.w(REG_XOR_PC, XOR);
		dev.c(ACT_CRC_CHECK_AND_RESET);
	}
	else
	{
		print("Checksum missmatch, process aborted");
		print("CRC PC = " + XOR);
		print("CRC MCU = " + dev.r(REG_XOR_MCU));

		print("Erasing memory...");
		dev.c(ACT_FLASH_ERASE);
		print("The memory has been cleared!");
	}
}
//------------------------

function FWU_DumpCommon(Name, Num, FinishReg)
{
	if (typeof Num === 'undefined')
		print("Необходимо указать номер блока в аргументе функции")
	else
	{
		var NumStr = "00" + Num
		NumStr = NumStr.substr(NumStr.length - 3)
		dev.Dump("../../sw-ConsoleScripts/regdump/" + Name + "_" + NumStr + ".regdump", 0, FinishReg)
	}
}

function FWU_RestoreCommon(Name, Num)
{
	if (typeof Num === 'undefined')
		print("Необходимо указать номер блока в аргументе функции")
	else
	{
		var NumStr = "00" + Num
		NumStr = NumStr.substr(NumStr.length - 3)
		dev.Restore("../../sw-ConsoleScripts/regdump/" + Name + "_" + NumStr + ".regdump")
	}
}

// ATU HP
function FWU_ATUHP()
{
	FWUpdateSTM("../../hw-ATUControlBoard/Firmware/Release/ATUControlBoard.binary");
}

function FWU_DumpATUHP(Num)
{
	FWU_DumpCommon("ATUHP", Num, 126)
}

function FWU_RestoreATUHP(Num)
{
	FWU_RestoreCommon("ATUHP", Num)
}

// TOMU
function FWU_TOMU()
{
	FWUpdateSTM("../../hw-TOMUControlBoard/Firmware/Release/TOMUControlBoard.binary");
}

function FWU_DumpTOMU()
{
	dev.Dump("../../hw-TOMUControlBoard/Firmware/TOMUControlBoard.regdump", 0, 126);
}

function FWU_RestoreTOMU()
{
	dev.Restore("../../hw-TOMUControlBoard/Firmware/TOMUControlBoard.regdump");
}
//------------------------

// TOMU HP
function FWU_TOMUHP()
{
	FWUpdateSTM("../../hw-TOMUHPControlBoard/Firmware/Release/TOMUHPControlBoard.binary");
}

function FWU_DumpTOMUHP()
{
	dev.Dump("../../hw-TOMUHPControlBoard/tomuhp.regdump", 0, 126);
}

function FWU_RestoreTOMUHP()
{
	dev.Restore("../../hw-TOMUHPControlBoard/tomuhp.regdump");
}
//------------------------

// TOCU HP
function FWU_TOCUHP()
{
	FWUpdateSTM("../../hw-TOCUHPControlBoard/Firmware/Release/TOCUHPControlBoard.binary");
}

function FWU_DumpTOCUHP()
{
	dev.Dump("../../hw-TOCUHPControlBoard/Firmware/tocuhp.regdump", 0, 126);
}

function FWU_RestoreTOCUHP()
{
	dev.Restore("../../hw-TOCUHPControlBoard/Firmware/tocuhp.regdump");
}
//------------------------

// LSLH
function FWU_LSLH()
{
	FWUpdateSTM("../../hw-LSLHControlBoard/Firmware/Release/LSLHControlBoard.binary");
}

function FWU_DumpLSLH(Num)
{
	FWU_DumpCommon("LSLH", Num, 126)
}

function FWU_RestoreLSLH(Num)
{
	FWU_RestoreCommon("LSLH", Num)
}
//------------------------

// LSLPC
function FWU_LSLPC()
{
	FWUpdateSTM("../../hw-LSLPowerCell/Firmware/Release/LSLPowerCell.binary");
}

function FWU_DumpLSLPC()
{
	dev.Dump("../../hw-LSLPowerCell/Firmware/LSLPowerCell.regdump", 0, 126);
}

function FWU_RestoreLSLPC()
{
	dev.Restore("../../hw-LSLPowerCell/Firmware/LSLPowerCell.regdump");
}
//------------------------

// DRCU
function FWU_DRCU()
{
	FWUpdateSTM("../../hw-DRCUControlBoard/Firmware/Release/DRCUControlBoard.binary");
}

function FWU_DumpDRCU()
{
	dev.Dump("../../hw-DRCUControlBoard/Firmware/DRCUControlBoard.regdump", 0, 126);
}

function FWU_RestoreDRCU()
{
	dev.Restore("../../hw-DRCUControlBoard/Firmware/DRCUControlBoard.regdump");
}
//------------------------

// EC Multiplexer
function FWU_Multiplexer()
{
	FWUpdateSTM("../../hw-ECMultiplexerBoard/Firmware/Release/ECMultiplexerBoard.binary");
}

function FWU_DumpMultiplexer()
{
	dev.Dump("../../hw-ECMultiplexerBoard/Firmware/ECMultiplexerBoard.regdump", 0, 126);
}

function FWU_RestoreMultiplexer()
{
	dev.Restore("../../hw-ECMultiplexerBoard/Firmware/ECMultiplexerBoard.regdump");
}
//------------------------

// EC ControlBoard
function FWU_ECControlBoard()
{
	FWUpdateSTM("../../hw-ECControlBoard/Firmware/Release/ECControlBoard.binary");
}

function FWU_DumpECControlBoard()
{
	dev.Dump("../../hw-ECControlBoard/Firmware/ECControlBoard.regdump", 0, 126);
}

function FWU_RestoreECControlBoard()
{
	dev.Restore("../../hw-ECControlBoard/Firmware/ECControlBoard.regdump");
}
//------------------------

// EC DCCurrentBoard
function FWU_ECDCCurrentBoard()
{
	FWUpdateSTM("../../hw-ECDCCurrentBoard/Firmware/Release/ECDCCurrentBoard.binary");
}

function FWU_DumpECDCCurrentBoard()
{
	dev.Dump("../../hw-ECDCCurrentBoard/Firmware/ECDCCurrentBoard.regdump", 0, 126);
}

function FWU_RestoreECDCCurrentBoard()
{
	dev.Restore("../../hw-ECDCCurrentBoard/Firmware/ECDCCurrentBoard.regdump");
}
//------------------------

// EC ACVoltageBoard
function FWU_ECACVoltageBoard()
{
	FWUpdateSTM("../../hw-ECACVoltageBoard/Firmware/Release/ECACVoltageBoard.binary");
}

function FWU_DumpECACVoltageBoard()
{
	dev.Dump("../../hw-ECACVoltageBoard/Firmware/ECACVoltageBoard.regdump", 0, 126);
}

function FWU_RestoreECACVoltageBoard()
{
	dev.Restore("../../hw-ECACVoltageBoard/Firmware/ECACVoltageBoard.regdump");
}
//------------------------

// EC DCVoltageBoard
function FWU_ECDCVoltageBoard()
{
	FWUpdateSTM("../../hw-ECDCVoltageBoard/Firmware/Release/ECDCVoltageBoard.binary");
}

function FWU_DumpECDCVoltageBoard()
{
	dev.Dump("../../hw-ECDCVoltageBoard/Firmware/ECDCVoltageBoard.regdump", 0, 126);
}

function FWU_RestoreECDCVoltageBoard()
{
	dev.Restore("../../hw-ECDCVoltageBoard/Firmware/ECDCVoltageBoard.regdump");
}
//------------------------

// EC DCHighVoltageBoard
function FWU_ECDCHighVoltageBoard()
{
	FWUpdateSTM("../../hw-ECDCHighVoltageBoard/Firmware/Release/ECDCHighVoltageBoard.binary");
}

function FWU_DumpECDCHighVoltageBoard()
{
	dev.Dump("../../hw-ECDCHighVoltageBoard/Firmware/ECDCHighVoltageBoard.regdump", 0, 126);
}

function FWU_RestoreECDCHighVoltageBoard()
{
	dev.Restore("../../hw-ECDCHighVoltageBoard/Firmware/ECDCHighVoltageBoard.regdump");
}
//------------------------

// LCTU
function FWU_LCTU()
{
	FWUpdateSTM("../../hw-LCTUControlBoard/Firmware/Release/LCTUControlBoard.binary");
}

function FWU_DumpLCTU()
{
	dev.Dump("../../hw-LCTUControlBoard/Firmware/LCTUControlBoard.regdump", 0, 126);
}

function FWU_RestoreLCTU()
{
	dev.Restore("../../hw-LCTUControlBoard/Firmware/LCTUControlBoard.regdump");
}
//------------------------

// FCROVU
function FWU_FCROVU()
{
	FWUpdateSTM("../../hw-FCROVUControlBoard/Firmware/Release/FCROVUControlBoard.binary");
}

function FWU_DumpFCROVU()
{
	dev.Dump("../../hw-FCROVUControlBoard/Firmware/FCROVUControlBoard.regdump", 0, 126);
}

function FWU_RestoreFCROVU()
{
	dev.Restore("../../hw-FCROVUControlBoard/Firmware/FCROVUControlBoard.regdump");
}
//------------------------

// PAU
function FWU_PAU()
{
	FWUpdateSTM("../../hw-PAUControlBoard/Firmware/Release/PAUControlBoard.binary");
}

function FWU_DumpPAU()
{
	dev.Dump("../../hw-PAUControlBoard/Firmware/PAUControlBoard.regdump", 0, 126);
}

function FWU_RestorePAU()
{
	dev.Restore("../../hw-PAUControlBoard/Firmware/PAUControlBoard.regdump");
}
//------------------------

// MCU (v.3.0)
function FWU_MCU()
{
	FWUpdateSTM("../../hw-ControlUnitBoard/Firmware/Release/ControlUnitBoard.binary");
}

function FWU_DumpMCU()
{
	dev.Dump("../../hw-ControlUnitBoard/Firmware/Release/ControlUnitBoard.regdump", 0, 126);
}

function FWU_RestoreMCU()
{
	dev.Restore("../../hw-ControlUnitBoard/Firmware/Release/ControlUnitBoard.regdump");
}
//------------------------

// IGTU
function FWU_IGTU()
{
	FWUpdateSTM("../../hw-IGTUControlBoard/Firmware/Release/IGTUControlBoard.binary");
}

function FWU_DumpIGTU()
{
	dev.Dump("../../hw-IGTUControlBoard/Firmware/Release/IGTUControlBoard.regdump", 0, 126);
}

function FWU_RestoreIGTU()
{
	dev.Restore("../../hw-IGTUControlBoard/Firmware/Release/IGTUControlBoard.regdump");
}
//------------------------

// LCSU
function FWU_LCSU()
{
	FWUpdateSTM("../../hw-LCSUControlBoard/Firmware/Release/LCSUControlBoard.binary");
}

function FWU_DumpLCSU(Num)
{
	FWU_DumpCommon("LCSU", Num, 126);
}

function FWU_RestoreLCSU(Num)
{
	FWU_RestoreCommon("LCSU", Num);
}
//------------------------

// PMXU
function FWU_PMXU()
{
	FWUpdateSTM("../../hw-PMXUControlBoard/Firmware/Release/PMXUControlBoard.binary");
}

function FWU_DumpPMXU()
{
	dev.Dump("../../hw-PMXUControlBoard/Firmware/PMXUControlBoard.regdump", 0, 126);
}

function FWU_RestorePMXU()
{
	dev.Restore("../../hw-PMXUControlBoard/Firmware/PMXUControlBoard.regdump");
}
//------------------------

// SVTU
function FWU_SVTU()
{
	FWUpdateSTM("../../hw-SVTUControlBoard/Firmware/Release/SVTUControlBoard.binary");
}

function FWU_DumpSVTU(Num)
{
	FWU_DumpCommon("SVTU", Num, 126);
}

function FWU_RestoreSVTU()
{
	FWU_RestoreCommon("SVTU", Num);
}
//------------------------

// SAU
function FWU_SAU()
{
	FWUpdateSTM("../../hw-SAUControlBoard/Firmware/Release/SAUControlBoard.binary");
}

function FWU_DumpSAU(Num)
{
	FWU_DumpCommon("SAU", Num, 126);
}

function FWU_RestoreSAU()
{
	FWU_RestoreCommon("SAU", Num);
}
//------------------------
// ITU
function FWU_ITU()
{
	FWUpdateSTM("../../hw-ITUControlBoard/Firmware/Release/ITUControlBoard.binary");
}

function FWU_DumpITU(Num)
{
	FWU_DumpCommon("ITU", Num, 126);
}

function FWU_RestoreITU()
{
	FWU_RestoreCommon("ITU", Num);
}
//------------------------
// CSI
function FWU_CSI()
{
	FWUpdateSTM("../../hw-CSControlBoardSTM32/Firmware/Release/CSControlBoardSTM32.binary");
}

function FWU_DumpCSI(Num)
{
	FWU_DumpCommon("CSI", Num, 126);
}

function FWU_RestoreCSI()
{
	FWU_RestoreCommon("CSI", Num);
}
//------------------------