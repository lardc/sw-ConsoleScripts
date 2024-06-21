var REG_FLASH_WRITE_LEN		= 184;	// Длина записываемых данных во флеш
var REG_FLASH_WRITE_DATA	= 185;	// Отладочный регистр для записи
var REG_FLASH_SYMBOL		= 186;	// Регистр для хранения значения для флеш записи

var ACT_FLASH_WRITE			= 332;	// Flash write
var ACT_FLASH_WRITE_SYMBOL	= 333;	// Flash symbol write
var ACT_FLASH_ERASE			= 334;	// Flash erase data sector

var ACT_READ_SYMBOL			= 330;
var ACT_SELECT_MEM_LABEL	= 331; 
var REG_MEM_SYMBOL			= 299;


// private
function flash_shift()
{
	dev.c(ACT_READ_SYMBOL);
}

function flash_read()
{
	return dev.r(REG_MEM_SYMBOL);
}


// public
// Структура 1 блока: Length, DataType, Data

/*
 * Data : any
 * Length : number
*/
function FlashWrite(Data, Length)
{
	dev.ws(REG_FLASH_WRITE_DATA, Data);
	dev.w(REG_FLASH_WRITE_LEN, Length);
	dev.c(ACT_FLASH_WRITE);
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
	dev.c(ACT_READ_SYMBOL);

	var tmpData = "";

	var DataArray = [];

	while (flash_read() != 65535)
	{
		var tmpLength = flash_read();
		tmpData += tmpLength + " ";
		flash_shift();

		tmpData += flash_read() + " ";
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
