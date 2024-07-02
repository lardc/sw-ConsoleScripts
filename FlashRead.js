var ACT_FLASH_WRITE			= 332;	// Flash write
var ACT_FLASH_ERASE			= 334;	// Flash erase data sector
var ACT_FLASH_ARRAY_PUSH	= 335;	// Add value from REG_FLASH_WRITE_DATA to array
var ACT_FLASH_ARRAY_CLEAR	= 336;	// Clear flash write buffer

var ACT_READ_SYMBOL			= 330;	// Flash read symbol and shift
var ACT_SELECT_MEM_LABEL	= 331;	// Flash read start position

var REG_FLASH_WRITE_DATA	= 184;	// Flash temporary data register
var REG_FLASH_WRITE_TYPE	= 185;	// Flash data type

var REG_MEM_SYMBOL			= 299;	// Current data


function flash_read()
{
	dev.c(ACT_READ_SYMBOL);
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

	var tmpData = "";

	var DataArray = [];

	for (var sp = 0x3D0000; sp < 0x3E0000; sp++)
	{
		var tmpDataType = flash_read();
		tmpData += tmpDataType + " ";

		if (tmpDataType > 7)
			break;

		var tmpLength = flash_read();
		tmpData += tmpLength + " ";

		for (var i = 0; i < tmpLength; i++)
		{
			tmpData += flash_read() + " ";
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
	for (var j = 0; j < i; j++)
	{
		p(flash_read());
	}
}

function FlashEraseDataSector()
{
	dev.c(ACT_FLASH_ERASE);
}
