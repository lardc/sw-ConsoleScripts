var CoefEmaFilter = 0.07
var KEI_SampleRate = 1000000;

function KEI_Reset()
{
	tmc.co();
	tmc.w('*RST');
}
//--------------------

function KEI_ConfigVoltage(PulseDuration_uS)
{
	KEI_Reset();
	
	BufferLength = KEI_SampleRate * PulseDuration_uS / 1e6
	
	tmc.w('TRAC:MAKE "TestBuffer",' + BufferLength);
	tmc.w('TRAC:CLE');
	
	tmc.w('SENS:DIG:FUNC "VOLT"');
	tmc.w('SENS:DIG:VOLT:SRAT ' + KEI_SampleRate);
	tmc.w('DISP:BUFF:ACT "TestBuffer"');
	tmc.w('DISP:SCR SWIPE_STAT');

	tmc.w('DIG:FUNC "VOLT"');
	tmc.w('DIG:COUN ' + BufferLength);
}
//--------------------

function KEI_SetVoltageRange(Range)
{
	tmc.w('DIG:VOLT:RANG ' + Range);
}
//--------------------

function KEI_ConfigCurrent(PulseDuration_uS)
{
	KEI_Reset();
	
	BufferLength = KEI_SampleRate * PulseDuration_uS / 1e6
	
	tmc.w('TRAC:MAKE "TestBuffer",' + BufferLength);
	tmc.w('TRAC:CLE');
	
	tmc.w('SENS:DIG:FUNC "CURR"');
	tmc.w('SENS:DIG:CURR:SRAT ' + KEI_SampleRate);
	tmc.w('DISP:BUFF:ACT "TestBuffer"');
	tmc.w('DISP:SCR SWIPE_STAT');

	tmc.w('DIG:FUNC "CURR"');
	tmc.w('DIG:COUN ' + BufferLength);
}
//--------------------

function KEI_SetCurrentRange(Range)
{
	tmc.w('DIG:CURR:RANG ' + Range);
}
//--------------------

function KEI_ConfigExtTrigger(Delay)
{
	tmc.w(':TRIG:EXT:IN:CLE');
	tmc.w(':TRIG:EXT:IN:EDGE RIS');
	
	tmc.w('TRIG:LOAD "EMPTY"');
	tmc.w('TRIG:BLOC:BUFF:CLEAR 1, "TestBuffer"');
	tmc.w('TRIG:BLOC:WAIT 2, EXT, ENT, OR');
	tmc.w('TRIG:BLOC:DEL:CONS 3, ' + Delay);
	tmc.w('TRIG:BLOC:MDIG 4, "TestBuffer",' + BufferLength);

	tmc.w(':DISPlay:BUFFer:ACTive "TestBuffer"');
	tmc.w(':DISPlay:SCReen GRAPh');
}
//--------------------

function KEI_ActivateTrigger()
{
	tmc.w(':INIT');
	tmc.w('*WAI');
}
//--------------------

function KEI_ReadAverage()
{
	return tmc.q('TRAC:STAT:AVER? "TestBuffer"');
}
//--------------------

function KEI_ReadMaximum()
{
	return tmc.q('TRAC:STAT:MAX? "TestBuffer"');
}
//--------------------

function KEI_ReadMinimum()
{
	return tmc.q('TRAC:STAT:MIN? "TestBuffer"');
}
//--------------------

function KEI_ReadPeakToPeak()
{
	return tmc.q('TRAC:STAT:PK2Pk? "TestBuffer"');
}
//--------------------

function KEI_ReadArrayMaximum()
{
	AverageValue = 0;
	SortedArrayEmaFloat = [];
	CoefBufferLengthForCalcAvg = 0;

	SortedArrayEmaFloat = KEI_EMA_Filter(KEI_ReadArray());

	SortedArrayEmaFloat.sort(function (a, b)
	{
		return a - b;
	});

	CoefBufferLengthForCalcAvg = SortedArrayEmaFloat.length / 1000;
	SamplingAvgNum = parseInt(15 * CoefBufferLengthForCalcAvg);
	MaxSamplesCutoffNum = parseInt(10 * CoefBufferLengthForCalcAvg);

	// Для вывода графика отсортированных данных
	// plot(SortedArrayEmaFloat, 1, 1);

	for (var i = SortedArrayEmaFloat.length - SamplingAvgNum - MaxSamplesCutoffNum;
			i < SortedArrayEmaFloat.length - MaxSamplesCutoffNum; ++i)
		AverageValue += SortedArrayEmaFloat[i];

	return (AverageValue / SamplingAvgNum);
}
//--------------------

function KEI_EMA_Filter(FloatArray)
{
	FilteredArrayEma = [];

	// ema filtering
	FilteredArrayEma[0] = FloatArray[0];

	for (var i = 1; i < FloatArray.length; ++i)
	{
		FilteredArrayEma[i] = FilteredArrayEma[i-1] +
			(FloatArray[i-1] - FilteredArrayEma[i-1]) * CoefEmaFilter;
	}
	
	// Для вывода графика данных до и после фильтра
	// plot2(FilteredArrayEma, FloatArray, 1, 1);

	return FilteredArrayEma;
}
//--------------------

function KEI_ReadArray()
{
	var SourceArray = [];
	var StringArray = [];
	var FloatArray = [];

	var StepIndex = 1;
	var StartIndex = 1;
	var EndIndex = StepIndex;
	var i = 0;

	while((EndIndex + i * StepIndex) <= BufferLength)
	{
		SourceArray[i] = tmc.q('TRAC:DATA? ' + (StartIndex + i * StepIndex) +
			', ' + (EndIndex + i * StepIndex) + ', "TestBuffer", READ');
		i++;
	}

	SourceArray = String(SourceArray);
	StringArray = SourceArray.split(",");
	FloatArray = StringArray.map(Number);

	for (var i = 0; i<FloatArray.length; i++)
	{
		//p(FloatArray[i]);
	}

	return FloatArray;
}

function KEI_ConfigVoltageDC(NPLC, AutoZero)
{
	KEI_Reset();

	tmc.w('SENSe:FUNCtion "VOLTage"');
	tmc.w(':VOLTage:NPLC ' + NPLC);
	tmc.w(':DISPlay:VOLTage:DIGits ' + KEI_DisplayDigits(NPLC));
	tmc.w(':VOLTage:AZERo ' + AutoZero);
	tmc.w(':SENSe:VOLTage:RANGe 1');
}

function KEI_ConfigCurrentDC(NPLC, AutoZero)
{
	KEI_Reset();

	tmc.w('SENSe:FUNCtion "CURR"');
	tmc.w(':CURR:NPLC ' + NPLC);
	tmc.w(':DISPlay:CURR:DIGits ' + KEI_DisplayDigits(NPLC));
	tmc.w(':CURR:AZERo ' + AutoZero);
	tmc.w(':SENSe:CURR:RANGe 1');
}

function KEI_DisplayDigits(NPLC)
{
	var Digits = 4;
	
	if(NPLC >= 0.01)
	{
		Digits = 5;
		if(NPLC > 0.1)
			Digits = 6;
	}

	return Digits;
}

function KEI_ConfigVoltageDCEdgeTrigger()
{
	tmc.w(':VOLTage:ATRigger:MODE EDGE');
	tmc.w(':VOLTage:ATRigger:EDGE:LEVel 0.01');
	tmc.w(':VOLTage:ATRigger:EDGE:SLOPe RISing');

	tmc.w(':TRIGger:LOAD "LoopUntilEvent", ATRigger, 30, ENTer, 0, "TestBuffer"');
	tmc.w(':DISPlay:BUFFer:ACTive "TestBuffer"');
	tmc.w(':DISPlay:SCReen GRAPh');
}

function KEI_VoltageDCTriggerLevel(Level)
{
	tmc.w(':VOLTage:ATRigger:EDGE:LEVel ' + Level);
}

function KEI_MakeTestBuffer(SampleRate, Pulse_uS) 
{
	KEI_BufferLength(SampleRate, Pulse_uS);
	tmc.w('TRACe:MAKE "TestBuffer",' + BufferLength);
	tmc.w('TRACe:FILL:MODE CONTinuous, "TestBuffer"');
	tmc.w('TRACe:LOG:STATe ON , "TestBuffer"');
}

function KEI_MakeTestBufferVoltageDC(NPLC, Pulse_uS) 
{
	var SampleRate = (1 / (20660 * NPLC + 29)) * 1e6;
	KEI_MakeTestBuffer(SampleRate, Pulse_uS);
}

function KEI_OPC()
{
	while(tmc.q('*OPC?') == 0)
		sleep(100);
}

function KEI_SetVoltageDCRange(Range)
{
	tmc.w(':SENSe:VOLTage:RANGe ' + Range);
}

function KEI_SetCurrentDCRange(Range)
{
	tmc.w(':SENSe:CURR:RANGe ' + Range);
}
function KEI_ClearBuffer()
{
	tmc.w(':TRACe:CLEar "TestBuffer"');
}

function KEI_BufferLength(SampleRate, Pulse_uS)
{
	BufferLength = Math.round(SampleRate * (Pulse_uS / 1e6));
}

function KEI_ConfigVoltageDigit(SampleRate)
{
	KEI_Reset();
	sleep(1000);

	tmc.w(':SENSe:DIGitize:FUNCtion "VOLTage"');
	tmc.w(':SENSe:DIGitize:VOLTage:SRATe ' + SampleRate);
}

function KEI_ConfigVoltageDigitEdgeTrigger()
{
	tmc.w(':DIGitize:VOLTage:ATRigger:MODE EDGE');
	tmc.w(':DIGitize:VOLTage:ATRigger:EDGE:LEVel 0.01');
	tmc.w(':DIGitize:VOLTage:ATRigger:EDGE:SLOPe RISing');

	tmc.w(':TRIGger:LOAD "LoopUntilEvent", ATRigger, 30, ENTer, 0, "TestBuffer"');
	tmc.w(':DISPlay:BUFFer:ACTive "TestBuffer"');
	tmc.w(':DISPlay:SCReen GRAPh');
}

function KEI_SetVoltageDigitRange(Range)
{
	tmc.w(':SENSe:DIGitize:VOLTage:RANGe ' +Range);
}

function KEI_VoltageDigitTriggerLevel(Level)
{
	tmc.w(':DIGitize:VOLTage:ATRigger:EDGE:LEVel ' + Level);
}

function KEI_FilterConfig(Func, On, Type, Count)
{
	tmc.w('SENS:' + Func + ':AVER:TCON ' + Type);
	tmc.w('SENS:' + Func + ':AVER:COUN ' + Count);
	tmc.w('SENS:' + Func + ':AVER ' + On );
}