
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
	tmc.w('TRAC:CLEAR');
	
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
	tmc.w('TRAC:CLEAR');
	
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
	tmc.q('TRAC:STAT:AVER? "TestBuffer"');
	return tmc.q('TRAC:STAT:AVER? "TestBuffer"');
}
//--------------------