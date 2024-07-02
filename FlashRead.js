var ACT_FLASH_WRITE			= 332;	// Flash write
var ACT_FLASH_ERASE			= 334;	// Flash erase data sector
var ACT_FLASH_ARRAY_PUSH	= 335;	// Add value from REG_FLASH_WRITE_DATA to array
var ACT_FLASH_ARRAY_CLEAR	= 336;	// Clear flash write buffer

var ACT_READ_SYMBOL			= 330;	// Flash read symbol and shift
var ACT_SELECT_MEM_LABEL	= 331;	// Flash read start position

var REG_FLASH_WRITE_DATA	= 184;	// Flash temporary data register
var REG_FLASH_WRITE_TYPE	= 185;	// Flash data type

var REG_MEM_SYMBOL			= 299;	// Current data

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
	return (Type > 4 ? 2 : 1)
}

// Структура блока: DataType, Length, Data

/*
 * Type: number 
 * Length : number
 * Data : any
*/
function FlashWrite(Data)
{
	dev.c(ACT_FLASH_ARRAY_CLEAR);
	for (var i = 0; i < Data.length; i++)
	{
		dev.w(REG_FLASH_WRITE_DATA, Data[i]);
		dev.c(ACT_FLASH_ARRAY_PUSH);
	}
	dev.c(ACT_FLASH_WRITE);
}

/*
 * @return Array<any>
*/ 
function FlashReadAll()
{
	dev.c(ACT_SELECT_MEM_LABEL);
	flash_shift()

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

function FlashRead(i)
{
	dev.c(ACT_SELECT_MEM_LABEL);
	for (var v = 0; v < i; v++)
	{
		p(flash_read());
		flash_shift();
	}
}

function FlashEraseDataSector()
{
	dev.c(ACT_FLASH_ERASE);
}
