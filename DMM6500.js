BufferLength = 0;
sic_gd_filter_points = 20;
sic_gd_filter_factor = 1;
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

function KEI_ReadArray()
{
	source_array = [];
	string_array = [];
	float_array = [];
	startIndex = 1;
	endIndex = 50;
	stepIndex = 50;
	i = 0;

	while((endIndex + i * stepIndex) <= BufferLength)
	{
		source_array[i] = tmc.q('TRAC:DATA? ' + (startIndex + i * stepIndex) +
			', ' + (endIndex + i * stepIndex) + ', "TestBuffer", READ');
		i++;
	}

	source_array = String(source_array);
	string_array = source_array.split(",");
	float_array = string_array.map(Number);

	return float_array;
}

function KEI_EMA_Filter(float_array)
{
	var k = 0.07
	var filtered_ema = [];

	// ema filtering
	filtered_ema[0] = float_array[0];

	for (var i = 1; i < float_array.length; ++i)
	{
		filtered_ema[i] = filtered_ema[i-1] + (float_array[i-1] - filtered_ema[i-1]) * k ;
	}
	
	// Для вывода данных до и после фильтра
	//
	plot2(filtered_ema,float_array,1,1);
	return filtered_ema;
}

function KEI_ReadArrayMaximum()
{
	sorted_ema_float = [];
	AverageValue = 0;
	k = 0;

	sorted_ema_float = KEI_EMA_Filter(KEI_ReadArray());

	sorted_ema_float.sort(function (a, b)
	{
		return a - b;
	});


	k = sorted_ema_float.length / 1000;
	SAMPLING_AVG_NUM = parseInt(15 * k);
	MAX_SAMPLES_CUTOFF_NUM = parseInt(10 * k);

	// Для вывода отсортированных данных на график
	//
	plot(sorted_ema_float,1,1);

	for (var i = sorted_ema_float.length - SAMPLING_AVG_NUM - MAX_SAMPLES_CUTOFF_NUM; i < sorted_ema_float.length - MAX_SAMPLES_CUTOFF_NUM; ++i)
		AverageValue += sorted_ema_float[i];

	return (AverageValue / SAMPLING_AVG_NUM);
}