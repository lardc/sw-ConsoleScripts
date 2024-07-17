var ACT_FLASH_WRITE			= 332;	// Flash write
var ACT_FLASH_ERASE			= 334;	// Flash erase data sector

var ACT_READ_SYMBOL			= 330;	// Flash read symbol and shift
var ACT_SELECT_MEM_LABEL	= 331;	// Flash read start position

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

function FlashWrite()
{
	dev.c(ACT_FLASH_WRITE);
}

function FlashReadAll(PrintPlot)
{
	dev.c(ACT_SELECT_MEM_LABEL);

	var FileName = "";

	while (true)
	{
		var dataType = flash_read();

		if (dataType > 7)
			break;

		var Data = [];
		var Message = "";

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
			Message += FileName + " (Type: Int16U, Length: " + length + ")\n";

			for (var i = 0; i < length; i++)
			{
				Data.push(flash_read());
				Message += Data[i] + ", ";
			}
			Message = Message.slice(0, -2); 

			if (Data.length > 1)
			{
				var date = new Date();
				FileName += "_" + (new Date(date.getTime() - (date.getTimezoneOffset() * 60000))).toISOString().slice(0, 19).replace(/[\-:]/g, "").replace("T", "_") + ".csv";
				save(FileName, Data);

				if (PrintPlot)
					pl(Data);
			}
			FileName = "";
		}
		p(Message);
	}
}

function FlashRead(i, Char)
{
	dev.c(ACT_SELECT_MEM_LABEL);
	for (var j = 0; j < i; j++)
	{
		p(Char ? String.fromCharCode(flash_read()) : flash_read());
	}
}

function FlashErase()
{
	dev.c(ACT_FLASH_ERASE);
}
