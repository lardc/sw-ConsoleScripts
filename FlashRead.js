var ACT_FLASH_WRITE			= 332;	// Flash write
var ACT_FLASH_ERASE			= 334;	// Flash erase data sector
var ACT_FLASH_ARRAY_PUSH	= 335;	// Add value from REG_FLASH_WRITE_DATA to array
var ACT_FLASH_ARRAY_CLEAR	= 336;	// Clear flash write buffer

var ACT_READ_SYMBOL			= 330;	// Flash read symbol and shift
var ACT_SELECT_MEM_LABEL	= 331;	// Flash read start position

var REG_FLASH_WRITE_DATA	= 184;	// Flash temporary data register
var REG_FLASH_WRITE_TYPE	= 185;	// Flash data type

var REG_MEM_SYMBOL			= 299;	// Current data

var FLASH_START				= 0x3D0000;
var FLASH_END				= 0x3E7FFF;

function flash_read()
{
	dev.c(ACT_READ_SYMBOL);
	return dev.r(REG_MEM_SYMBOL);
}

function TypeLength(Type)
{
	return (Type > 4 ? 2 : 1)
}

function FlashWrite()
{
	dev.c(ACT_FLASH_WRITE);
}

function FlashReadAll(PrintPlot)
{
	dev.c(ACT_SELECT_MEM_LABEL);

	var Data = [];

	var FileName = "";

	for (var sp = FLASH_START; sp < FLASH_END; sp++)
	{
		var dataType = flash_read();

		if (dataType > 7)
			break;

		if (dataType == 0)
		{
			var Description = "";
			var length = flash_read();

			for (var i = 0; i < length; i++)
			{
				Description += String.fromCharCode(flash_read());
			}
			FileName += Description;
		}
		else
		{
			var length = flash_read();

			for (var i = 0; i < length; i++)
			{
				Data.push(flash_read());
			}

			if (Data.length > 1)
			{
				FileName += "_" + (new Date()).toISOString().slice(0, 19).replace(/[\-:]/g, "").replace("T", "_") + ".csv";
				save(FileName, Data);

				if (PrintPlot)
					pl(Data);
			}
			FileName = "";
			Data = [];
		}
	}
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
