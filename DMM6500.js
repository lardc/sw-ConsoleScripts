CoefEmaFilter = 0.07
KEI_SampleRate = 1000000;

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
	tmc.w('TRIG:BLOC:MDIG 4, "TestBuffer", AUTO');
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
	SourceArray = [];
	StringArray = [];
	FloatArray = [];

	StepIndex = 50;
	StartIndex = 1;
	EndIndex = StepIndex;
	i = 0;

	while((EndIndex + i * StepIndex) <= BufferLength)
	{
		SourceArray[i] = tmc.q('TRAC:DATA? ' + (StartIndex + i * StepIndex) +
			', ' + (EndIndex + i * StepIndex) + ', "TestBuffer", READ');
		i++;
	}

	SourceArray = String(SourceArray);
	StringArray = SourceArray.split(",");
	FloatArray = StringArray.map(Number);

	return FloatArray;
}

