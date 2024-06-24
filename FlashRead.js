var REG_FLASH_WRITE_LEN		= 184;	// Длина записываемых данных во флеш
var REG_FLASH_WRITE_DATA	= 185;	// Отладочный регистр для записи
var REG_FLASH_SYMBOL		= 186;	// Регистр для хранения значения для флеш записи
var REG_FLASH_WRITE_TYPE	= 187;	// Длина записываемых данных во флеш

var ACT_FLASH_WRITE			= 332;	// Flash write
var ACT_FLASH_WRITE_SYMBOL	= 333;	// Flash symbol write
var ACT_FLASH_ERASE			= 334;	// Flash erase data sector

var ACT_READ_SYMBOL			= 330;
var ACT_SELECT_MEM_LABEL	= 331; 
var REG_MEM_SYMBOL			= 299;

// Data types
var DT_Char		= 0;
var DT_Int8U	= 1;
var DT_Int8S	= 2;
var DT_Int16U	= 3;
var DT_Int16S	= 4;
var DT_Int32U	= 5;
var DT_Int32S	= 6;
var DT_Float	= 7;

function flash_shift()
{
	dev.c(ACT_READ_SYMBOL);
}

function flash_read()
{
	return dev.r(REG_MEM_SYMBOL);
}

function TypeLength(Type)
{
	return ((Type == DT_Int32U || Type == DT_Int32S || Type == DT_Float) ? 2 : 1)
}

// Структура блока: DataType, Length, Data

/*
 * Data : any
 * Length : number
*/
function FlashWrite(Type, Length, Data)
{
	dev.w(REG_FLASH_WRITE_TYPE, Type);
	dev.w(REG_FLASH_WRITE_LEN, Length);

	if (typeof Data == "number")
	{
		if (Data < 0)
			dev.Write32S(REG_FLASH_WRITE_DATA, Data);
		else
			dev.Write32(REG_FLASH_WRITE_DATA, Data);

		dev.c(ACT_FLASH_WRITE);

		return;
	}
	else if (typeof Data == "object")
	{
		for (var i = 0; i < Length; i++)
		{
			if (Data[i] < 0)
				dev.Write32S(REG_FLASH_WRITE_DATA, Data);
			else
				dev.Write32(REG_FLASH_WRITE_DATA, Data);

			dev.w(REG_FLASH_WRITE_LEN);
			dev.c(ACT_FLASH_WRITE_SYMBOL);
		}
	}
}

/*
 * Data : Array<any>
*/
function FlashWriteArray(Data)
{
	dev.w(REG_FLASH_SYMBOL, Data.length);
	dev.c(ACT_FLASH_WRITE_SYMBOL);

	dev.w(REG_FLASH_SYMBOL, 1);
	dev.c(ACT_FLASH_WRITE_SYMBOL);

	for (var i = 0; i < Data.length; i++)
	{
		dev.w(REG_FLASH_SYMBOL, Data[i]);
		dev.c(ACT_FLASH_WRITE_SYMBOL);
	}
}

/*
 * @return Array<any>
*/ 
function FlashReadAll()
{
	dev.c(ACT_SELECT_MEM_LABEL);

	var tmpData = "";

	var DataArray = [];

	while (flash_read() < 65535)
	{
		var tmpDataType = flash_read();
		tmpData += tmpDataType + " ";
		flash_shift();

		var tmpLength = flash_read();
		tmpData += tmpLength + " ";
		flash_shift();

		for (var i = 0; i < tmpLength; i++)
		{
			tmpData += flash_read() + " ";
			flash_shift();
		}

		DataArray.push(tmpData);
		p(tmpData);
		tmpData = "";
	}

	return DataArray;
}

function FlashEraseDataSector()
{
	dev.c(ACT_FLASH_ERASE);
}
