include("PrintStatus.js")
include("DMM6500.js")

SVTU_DS_None			= 0
SVTU_DS_Fault			= 1
SVTU_DS_Disabled		= 2
SVTU_DS_BatteryCharge	= 3
SVTU_DS_Ready			= 4
SVTU_DS_InProcess		= 5

//
SVTU_Print = 1;
SVTU_SampleRate = 100000; 	// частота дискретизации, Гц
SVTU_Rshunt = 0.00025;		// сопротивление шунта, Ом
SVTU_Pulse_us = 1000;		// длительность импульса, мкс

function SVTU_StartMeasure(Current, GateVoltage)
{
	dev.w(128, Current);
	dev.wf(129, GateVoltage);
	
	var start = new Date();
	if(dev.r(192) != SVTU_DS_Ready)
	{
		if (dev.r(192) == SVTU_DS_Fault)
		{
			PrintStatus();
			dev.c(3);
			p("Сброшен Fault");
			dev.c(1);
			if(dev.r(192) == SVTU_DS_Fault)
				return 0;
		}

		if (dev.r(192) == SVTU_DS_None || dev.r(192) == SVTU_DS_Disabled)
			dev.c(1);

		while (dev.r(192) != SVTU_DS_Ready)
		{
			if(dev.r(192) == SVTU_DS_Fault)
			{
				PrintStatus();
				return 0;
			}
			var end = new Date();
			pinline('\rВремя заряда, с: ' + (end - start) / 1000);
			sleep(100);
			if(anykey()) return 0;
		}
		p("");
	}

	if(anykey()) return 0;

	if(dev.r(192) == SVTU_DS_Ready)
	{
		dev.c(100);
		while(dev.r(192) != SVTU_DS_Ready){sleep(500);}
	}

	if(dev.r(197) == 1)
	{
		if(SVTU_Print)
		{			
			var Current = dev.rf(201);
			
			print("DutVoltage, mV : " + dev.rf(200).toFixed(2));
			print("DutCurrent, A  : " + Current.toFixed(2));
			print("GateVoltage, V: " + dev.rf(202).toFixed(2));
			print("GateCurrent, mA: " + dev.rf(203).toFixed(2));
			print("---------------------------");
		}

		return 1;
	}

	else
		PrintStatus();
	
	return 0;
}
//--------------------------
function SVTU_StartMeasure_KEI(Current, GateVoltage)
{
	KEI_ConfigVoltageDigit(SVTU_SampleRate);
	KEI_MakeTestBuffer(SVTU_SampleRate, SVTU_Pulse_us);
	KEI_ConfigVoltageDigitEdgeTrigger();
	KEI_SetVoltageDigitRange(Current * SVTU_Rshunt);
	KEI_VoltageDigitTriggerLevel(Current * SVTU_Rshunt / 2);
	KEI_ActivateTrigger();

	sleep(1000);
	SVTU_StartMeasure(Current, GateVoltage);

	var IdSc = (KEI_ReadArrayTrapeze() / SVTU_Rshunt).toFixed(2);
	print("IdDMM, A: " + IdSc);
	print("---------------------------");
}
//--------------------------

function SVTU_ResourceTest(Current, GateVoltage, HoursTest, Period_ms)
{
	var start = new Date();
	var stop = new Date();
	var hours = start.getHours() + HoursTest;
	stop.setHours(hours);
	var i = 1;
	var lastPulseStartMs = null;

	while((new Date()).getTime() < stop.getTime())
	{
		var start_pulse = new Date();
		var stop_pulse = new Date();
		var milliseconds = start_pulse.getMilliseconds() + Period_ms;
		stop_pulse.setMilliseconds(milliseconds);

		var beforePulseMs = (new Date()).getTime();
		if (lastPulseStartMs !== null)
		{
			var actualIntervalMs = beforePulseMs - lastPulseStartMs;
			print("Фактический интервал между импульсами: " + actualIntervalMs + " мс (задано " + Period_ms + " мс)");
		}
		lastPulseStartMs = beforePulseMs;

		SVTU_StartMeasure(Current, GateVoltage);
		var left_time = new Date(stop.getTime() - (new Date()).getTime());
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");

		while((new Date()).getTime() < stop_pulse.getTime())
		{
			if (anykey()) return;
			sleep(1);
		}

		i++;

		if (anykey()) break;
	}
}