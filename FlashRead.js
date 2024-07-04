const ACT_FLASH_WRITE		= 332;	// Flash write
const ACT_FLASH_ERASE		= 334;	// Flash erase data sector
const ACT_FLASH_ARRAY_PUSH	= 335;	// Add value from REG_FLASH_WRITE_DATA to array
const ACT_FLASH_ARRAY_CLEAR	= 336;	// Clear flash write buffer

const ACT_READ_SYMBOL		= 330;	// Flash read symbol and shift
const ACT_SELECT_MEM_LABEL	= 331;	// Flash read start position

const REG_FLASH_WRITE_DATA	= 184;	// Flash temporary data register
const REG_FLASH_WRITE_TYPE	= 185;	// Flash data type

const REG_MEM_SYMBOL		= 299;	// Current data

const FLASH_START			= 0x3D0000
const FLASH_END				= 0x3E0000


function flash_read()
{
	dev.c(ACT_READ_SYMBOL);
	return dev.r(REG_MEM_SYMBOL);
}

function TypeLength(Type)
{
	return (Type > 4 ? 2 : 1)
}

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

function FlashReadDescription()
{
	var Description = "";
	var length = flash_read();
	Description += length;

	for (var i = 0; i < length; i++)
	{
		Description += String.fromCharCode(flash_read());
	}

	return Description;
}

/*
 * @return Array<any>
*/ 
function FlashReadAll()
{
	dev.c(ACT_SELECT_MEM_LABEL);

	var Data = "";

	var DataArray = [];

	for (var sp = FLASH_START; sp < FLASH_END; sp++)
	{
		var dataType = flash_read();
		Data += dataType + " ";

		if (dataType > 7)
			break;

		if (dataType == 0)
		{
			var Description = "";
			var length = flash_read();
			Description += length;

			for (var i = 0; i < length; i++)
			{
				Description += String.fromCharCode(flash_read());
			}
		}

		var tmpLength = flash_read();
		Data += tmpLength + " ";

		for (var i = 0; i < tmpLength; i++)
		{
			Data += flash_read() + " ";
		}

		DataArray.push(Data);
		Data = "";
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

function FlashErase()
{
	dev.c(ACT_FLASH_ERASE);
}
