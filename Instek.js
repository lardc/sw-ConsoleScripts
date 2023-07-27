include("Tektronix.js")

instek_range = 0;


function Instek_PortInit(PortNumber, BaudeRate)
{
	TEK_PortInit(PortNumber, BaudeRate);
}

function Instek_Send(Request)
{
	TEK_Send(Request);
}

function Instek_Exec(Request)
{
	return TEK_Exec(Request);
}



function Instek_ConfAuto(Enable)
{
	Instek_Send("CONF:AUTO " + (Enable ? "ON" : "OFF"));
}

// Rate: "S" - slow , "M" - mid, "H" - high
function Instek_ConfDetectorRate(Rate)
{
	Instek_Send("SENS:DET:RATE " + Rate);
}

function Instek_ConfVoltageDC(Range)
{
	instek_range = Range;
	
	Instek_ConfAuto(false);
	Instek_Send("CONF:VOLT:DC " + instek_range.toExponential(1));
}

function Instek_ConfCurrentDC(Range)
{
	instek_range = Range;
	
	Instek_ConfAuto(false);
	Instek_Send("CONF:CURR:DC " + instek_range.toExponential(1));
}

function Instek_ConfResistance(Range)
{
	instek_range = Range;
	
	Instek_ConfAuto(false);
	Instek_Send("CONF:RES " + instek_range.toExponential(1));
}



function Instek_ReadDisplayValue()
{
	return parseFloat(Instek_Exec("READ?"));
}

function Instek_MeasureVolDC()
{
	return parseFloat(Instek_Exec("MEAS:VOLT:DC? " + instek_range.toExponential(1)));
}

function Instek_MeasureCurDC()
{
	return parseFloat(Instek_Exec("MEAS:CURR:DC? " + instek_range.toExponential(1)));
}

function Instek_MeasureRes()
{
	return parseFloat(Instek_Exec("MEAS:RES? " + instek_range.toExponential(1)));
}



function Instek_SystemLocal()
{
	Instek_Send("SYST:LOC");
}

function Instek_SystemRemote()
{
	Instek_Send("SYST:REM");
}

function Instek_SystemRWLock()
{
	Instek_Send("SYST:RWL");
}



function Instek_CalFunction(FunctionNumber)
{
	switch (FunctionNumber)
	{
		case 0:
			Instek_Send("CALC:FUNC OFF");
			break;
			
		case 1:
			Instek_Send("CALC:FUNC MIN");
			break;
			
		case 2:
			Instek_Send("CALC:FUNC MAX");
			break;
			
		case 3:
			Instek_Send("CALC:FUNC HOLD");
			break;
			
		case 4:
			Instek_Send("CALC:FUNC HOLD");
			break;
			
		case 5:
			Instek_Send("CALC:FUNC REL");
			break;
			
		case 6:
			Instek_Send("CALC:FUNC COMP");
			break;
		
		case 7:
			Instek_Send("CALC:FUNC DB");
			break;
			
		case 8:
			Instek_Send("CALC:FUNC DBM");
			break;
			
		case 9:
			Instek_Send("CALC:FUNC MXB");
			break;
			
		case 10:
			Instek_Send("CALC:FUNC INV");
			break;
			
		case 11:
			Instek_Send("CALC:FUNC REF");
			break;
	}
}

function Instek_CalState(Enable)
{
	Instek_Send("CALC:STAT " + (Enable ? "ON" : "OFF"));
}

function Instek_CalMin()
{
	return Instek_Exec("CALC:MIN?")
}

function Instek_CalMax()
{
	return Instek_Exec("CALC:MAX?")
}

function Instek_CalHoldReferebce(Ref)
{
	return Instek_Send("CALC:HOLD:REF " + Ref);
}

function Instek_CalRelReference(Ref)
{
	return Instek_Send("CALC:REL:REF " + Ref);
}

function Instek_CalLimitLower(Comp_lim)
{
	return Instek_Send("CALC:LIM:LOW " + Comp_lim);
}

function Instek_CalLimitUpper(Comp_lim)
{
	return Instek_Send("CALC:LIM:UPP " + Comp_lim);
}

function Instek_CaldBReference(Ref)
{
	return Instek_Send("CALC:DB:REF " + Ref);
}

function Instek_CaldBmReference(Ref)
{
	return Instek_Send("CALC:DBM:REF " + Ref);
}

function Instek_CalMathMMFactor(Ref)
{
	return Instek_Send("CALC:MATH:MMF " + Ref);
}

function Instek_CalMathMBFactor(Ref)
{
	return Instek_Send("CALC:MATH:MBF " + Ref);
}

function Instek_CalMathPersent(Ref)
{
	return Instek_Send("CALC:MATH:PERC " + Ref);
}

function Instek_CalNullOffset(Ref)
{
	return Instek_Send("CALC:NULL:OFFS " + Ref);
}



function Instek_RequestErr()
{
	return Instek_Exec("SYST:ERR?")
}

function Instek_RequestAuto()
{
	return Instek_Exec("CONF:AUTO?")
}

function Instek_RequestFunction()
{
	return Instek_Exec("CONF:FUNC?")
}

function Instek_RequestRange()
{
	return Instek_Exec("CONF:RANG?")
}

function Instek_RequestDetectorRate()
{
	return Instek_Exec("DET:RATE?")
}

function Instek_RequestCalFunction()
{
	return Instek_Exec("CALC:FUNC?")
}

function Instek_RequestCalState()
{
	return Instek_Exec("CALC:STAT?")
}

function Instek_RequestCalMin()
{
	return Instek_Exec("CALC:MIN?")
}

function Instek_RequestCalMax()
{
	return Instek_Exec("CALC:MAX?")
}

function Instek_RequestCalHold()
{
	return Instek_Exec("CALC:HOLD:REF?")
}

function Instek_RequestCalRel()
{
	return Instek_Exec("CALC:REL:REF?")
}

function Instek_RequestCalLimLow()
{
	return Instek_Exec("CALC:LIM:LOW?")
}

function Instek_RequestCalLimUpp()
{
	return Instek_Exec("CALC:LIM:UPP?")
}

function Instek_RequestCaldBRef()
{
	return Instek_Exec("CALC:DB:REF?")
}

function Instek_RequestCaldBmRef()
{
	return Instek_Exec("CALC:DBM:REF?")
}

function Instek_RequestCalMathMMF()
{
	return Instek_Exec("CALC:MATH:MMF?")
}

function Instek_RequestCalMathMBF()
{
	return Instek_Exec("CALC:MATH:MBF?")
}

function Instek_RequestCalMathPercent()
{
	return Instek_Exec("CALC:MATH:PERC?")
}

function Instek_RequestCalNullOffset()
{
	return Instek_Exec("CALC:NULL:OFFS?")
}




