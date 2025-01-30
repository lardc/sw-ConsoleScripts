var ACT_FLASH_DIAG_INIT_READ		= 331;
var ACT_FLASH_DIAG_SAVE				= 332;
var ACT_FLASH_DIAG_ERASE			= 333;

var ACT_FLASH_COUNTER_INIT_READ		= 334;
var ACT_FLASH_COUNTER_SET			= 336;
var ACT_FLASH_COUNTER_SAVE			= 337;
var ACT_FLASH_COUNTER_ERASE			= 338;

var ACT_FLASH_COUNTER_TO_EP			= 339;
var ACT_FLASH_DIAG_TO_EP			= 340;

var ACT_JSON_INIT_READ				= 341;
var ACT_JSON_TO_EP					= 342;

var REG_MEM_SYMBOL					= 299;

var EP_FLASH_DATA					= 20;

var DT_Char		= 0;
var DT_Int8U	= 1;
var DT_Int8S	= 2;
var DT_Int16U	= 3;
var DT_Int16S	= 4;
var DT_Int32U	= 5;
var DT_Int32S	= 6;
var DT_Float	= 7;

var FR_ForceEP = true;
var FR_LocalDataCopy;
var FR_LocalDataCounter = 0;

function ReadSymbolWrapper(ActReadSymbol)
{
	if(!FR_LocalDataCopy || FR_LocalDataCopy.length == FR_LocalDataCounter)
	{
		try
		{
			dev.c(ActReadSymbol);
			FR_LocalDataCopy = dev.raf(EP_FLASH_DATA);
			FR_LocalDataCounter = 0;
		}
		catch(e)
		{
			if(FR_ForceEP)
				throw new Error("EP not supported");
		}
	}
	
	if(FR_LocalDataCounter < FR_LocalDataCopy.length)
		return FR_LocalDataCopy[FR_LocalDataCounter++];
	else
		return 0xFFFF;
}

function FR_Reset()
{
	FR_LocalDataCopy = null;
	FR_LocalDataCounter = 0;
}

function DataTypeString(DataType)
{
	switch (DataType)
	{
		case DT_Char:	return "Char";
		case DT_Int8U:	return "Int8U";
		case DT_Int8S:	return "Int8S";
		case DT_Int16U:	return "Int16U"
		case DT_Int16S:	return "Int16S";
		case DT_Int32U:	return "Int32U";
		case DT_Int32S:	return "Int32S";
		case DT_Float:	return "Float";
		default:		return "";
	}
}

function TypeLength(Type)
{
	return (Type > 4 ? 2 : 1)
}

function ToInt8U(value)
{
	return value & 0xFF;
}

function ToInt8S(value)
{
	value &= 0xFF;
	return (value > 0x7F) ? value - 0x100 : value;
}

function ToInt16S(value)
{
	return (value > 0x7FFF) ? value - 0x10000 : value;
}

function ToInt32U(HIGH, LOW)
{
	return (HIGH << 16) | LOW;
}

function ToInt32S(HIGH, LOW)
{
	var value = (HIGH << 16) | LOW
	return (value > 0x7FFFFFFF) ? value - 0x100000000 : value;
}

function ToFloat(value)
{
	var sign = (value & 0x80000000) ? -1 : 1;
	var exponent = ((value >> 23) & 0xFF) - 127;
	var significand = (value & ~(-1 << 23));

	if (exponent == 128) 
		return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);

	if (exponent == -127)
	{
		if (significand == 0)
			return sign * 0.0;
		exponent = -126;
		significand /= (1 << 22);
	}
	else
		significand = (significand | (1 << 23)) / (1 << 23);

	return sign * significand * Math.pow(2, exponent);
}

function FlashWrite()
{
	dev.c(ACT_FLASH_DIAG_SAVE);
}

function FlashReadDiag(PrintPlot)
{
	FlashReadAll(ACT_FLASH_DIAG_INIT_READ, ACT_FLASH_DIAG_TO_EP, PrintPlot);
}

function FlashReadCounters()
{
	FlashReadAll(ACT_FLASH_COUNTER_INIT_READ, ACT_FLASH_COUNTER_TO_EP, false);
}

function FlashEraseDiag()
{
	dev.c(ACT_FLASH_DIAG_ERASE);
}

function FlashEraseCounters()
{
	dev.c(ACT_FLASH_COUNTER_ERASE);
}

function FlashReadAll(ActMemLabel, ActReadSymbol, PrintPlot)
{
	dev.c(ActMemLabel);
	var FileName = "";

	while (true)
	{
		var dataType = ReadSymbolWrapper(ActReadSymbol);

		if (dataType == 0xFFFF)
		{
			FR_Reset();
			p("[End of data]")
			return;
		}
		if (dataType > 7)
		{
			FR_Reset();
			p("ERROR: Invalid data type.");
			p(dataType);
			return;
		}

		var dataTypeLength = TypeLength(dataType);

		var Data = [];
		var Message = "";

		// Read description
		if (dataType == DT_Char)
		{
			var Description = "";
			var length = ReadSymbolWrapper(ActReadSymbol);

			for (var i = 0; i < length; i++)
			{
				Description += String.fromCharCode(ReadSymbolWrapper(ActReadSymbol));
			}
			FileName += Description;
		}
		else
		{
			var length = ReadSymbolWrapper(ActReadSymbol);
			Message += FileName + " (Type: " + DataTypeString(dataType) + ", Length: " + length + ")\n";

			for (var i = 0; i < length; i++)
			{
				var word = 0;
				if (dataTypeLength == 2)
				{
					var LOW = ReadSymbolWrapper(ActReadSymbol);
					var HIGH = ReadSymbolWrapper(ActReadSymbol);
					switch (dataType)
					{
						case DT_Int32U:
							word = ToInt32U(HIGH, LOW);
							break;
						case DT_Int32S:
							word = ToInt32S(HIGH, LOW);
							break;
						case DT_Float:
							word = ToFloat(ToInt32S(HIGH, LOW));
							break;
					}
				}
				else
				{
					var value = ReadSymbolWrapper(ActReadSymbol);
					switch (dataType)
					{
						case DT_Int8U:
							word = ToInt8U(value);
							break;
						case DT_Int8S:
							word = ToInt8S(value);
							break;
						case DT_Int16U:
							word = value;
							break;
						case DT_Int16S:
							word = ToInt16S(value);
							break;
					}
				}

				Data.push(word);
				Message += Data[i] + ", ";
			}
			Message = Message.slice(0, -2); 

			if (Data.length > 1)
			{
				var date = new Date();
				FileName += "_" + (new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
					).toISOString().slice(0, 19).replace(/[\-:]/g, "").replace("T", "_") + ".csv";
				save(FileName, Data);

				if (PrintPlot)
					pl(Data);
			}
			FileName = "";
		}
		p(Message);

		if (anykey()) return;
	}
}

