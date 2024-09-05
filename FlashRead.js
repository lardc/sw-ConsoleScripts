var ACT_FLASH_DIAG_SAVE			= 332;	// Flash write
var ACT_FLASH_DIAG_ERASE		= 333;	// Flash erase data sector

var ACT_FLASH_DIAG_READ_SYMBOL	= 330;	// Flash read symbol and shift
var ACT_FLASH_DIAG_INIT_READ	= 331;	// Flash read start position

var REG_MEM_SYMBOL				= 299;	// Current data

var ACT_FLASH_COUNTER_INIT_READ	= 334;	// Перемещение указателя в область счетчиков
var ACT_FLASH_COUNTER_READ_SYMBOL= 335;	// Сохранение наработки счетчиков во флеш
var ACT_FLASH_COUNTER_SAVE		= 336

var DT_Char		= 0;
var DT_Int8U	= 1;
var DT_Int8S	= 2;
var DT_Int16U	= 3;
var DT_Int16S	= 4;
var DT_Int32U	= 5;
var DT_Int32S	= 6;
var DT_Float	= 7;


function flash_read(ActReadSymbol)
{
	dev.c(ActReadSymbol);
	return dev.r(REG_MEM_SYMBOL);
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

	if (exponent == -127) {
		if (significand == 0) return sign * 0.0;
		exponent = -126;
		significand /= (1 << 22);
	} else significand = (significand | (1 << 23)) / (1 << 23);

	return sign * significand * Math.pow(2, exponent);
}

function FlashWrite()
{
	dev.c(ACT_FLASH_DIAG_SAVE);
}

function FlashReadDiag(PrintPlot)
{
	FlashReadAll(ACT_FLASH_DIAG_INIT_READ, ACT_FLASH_DIAG_READ_SYMBOL, PrintPlot);
}

function FlashReadCounters()
{
	FlashReadAll(ACT_FLASH_COUNTER_INIT_READ, ACT_FLASH_COUNTER_READ_SYMBOL, false);
}

function FlashReadDiagRaw(i)
{
	FlashRead(i, ACT_FLASH_DIAG_INIT_READ);
}

function FlashEraseDiag()
{
	dev.c(333);
}

function FlashEraseCounters()
{
	dev.c(338);
}

function FlashReadAll(ActMemLabel, ActReadSymbol, PrintPlot)
{
	dev.c(ActMemLabel);

	var FileName = "";

	while (true)
	{
		var dataType = flash_read(ActReadSymbol);

		if (dataType == 0xFFFF)
		{
			p("ERROR: No data.")
			return;
		}
		if (dataType > 7)
		{
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
			var length = flash_read(ActReadSymbol);

			for (var i = 0; i < length; i++)
			{
				Description += String.fromCharCode(flash_read(ActReadSymbol));
			}
			FileName += Description;
		}
		else
		{
			var length = flash_read(ActReadSymbol);
			Message += FileName + " (Type: " + DataTypeString(dataType) + ", Length: " + length + ")\n";

			for (var i = 0; i < length; i++)
			{
				var word = 0;
				if (dataTypeLength == 2)
				{
					var LOW = flash_read(ActReadSymbol);
					var HIGH = flash_read(ActReadSymbol);
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
					var value = flash_read(ActReadSymbol);
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
				FileName += "_" + (new Date(date.getTime() - (date.getTimezoneOffset() * 60000))).toISOString().slice(0, 19).replace(/[\-:]/g, "").replace("T", "_") + ".csv";
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

function FlashRead(i, ActMemLabel)
{
	if (ActMemLabel == ACT_FLASH_DIAG_INIT_READ)
	{
		dev.c(ACT_FLASH_DIAG_INIT_READ);
		for (var j = 0; j < i; j++)
		{
			p(flash_read(ACT_FLASH_DIAG_READ_SYMBOL));
		}
	}

	if (ActMemLabel == ACT_FLASH_COUNTER_INIT_READ)
	{
		dev.c(ACT_FLASH_COUNTER_INIT_READ);
		for (var j = 0; j < i; j++)
		{
			var Word1 = flash_read(ACT_FLASH_COUNTER_READ_SYMBOL);
			p(Word1);
		}
	}
}

function FlashErase()
{
	dev.c(ACT_FLASH_DIAG_ERASE);
}


/** DEBUG MXU
	* REG_CNT_NUMBER	104
	* REG_CNT_VALUE		105
	* ACT_SET_COUNTER	336
*/
function AssignCounter(Index, Value)
{
	dev.w(104, Index);
	dev.w(105, Value);
	dev.c(336);
}
