include("PrintStatus.js")
include("DMM6500.js")

LCSU_DS_None 		= 0
LCSU_DS_Fault		= 1
LCSU_DS_Disabled	= 2
LCSU_DS_Ready 		= 3
LCSU_DS_ConfigReady = 4
LCSU_DS_InProcess 	= 5

LCSU_SampleRate = 100000; 	// частота дискретизации, Гц
LCSU_Rshunt = 0.00025;		// сопротивление шунта, Ом

// Коэффициенты регулятора
clcsu_RegulatorProp0 = 0;
clcsu_RegulatorIntegral0 = 0;
clcsu_RegulatorProp1 = 0;
clcsu_RegulatorIntegral1 = 0;
clcsu_RegulatorProp2 = 0;
clcsu_RegulatorIntegral2 = 0;

lcsu_print = 1;

function LCSU_Start(Type, Current, Pulse_ms)
{
	dev.w(19,Type);
	// Enable power
	if(dev.r(192) == LCSU_DS_None)
	{
		dev.c(1);
		while (dev.r(192) != LCSU_DS_Ready)
		{
			p("Напряжение на ячейках = " + dev.r(201) + " В");
			sleep(1000);			
		}
		p("Напряжение на ячейках = " + dev.r(201) + " В");
	}	
	else if (dev.r(192) == LCSU_DS_Fault)	
	{
		dev.c(3);
		dev.c(1);
		while (dev.r(192) != LCSU_DS_Ready)
		{
			p("Напряжение на ячейках = " + dev.r(201) + " В");
			sleep(1000);			
		}
		p("Напряжение на ячейках = " + dev.r(201) + " В");
	}

	dev.wf(128, Current);
	dev.w(129, Pulse_ms);
	dev.c(100);
	
	while(dev.r(192) != LCSU_DS_ConfigReady)
	{
		sleep(50);
		
		if(dev.r(192) == LCSU_DS_Fault)
		{
			PrintStatus();
			return false;
		}
	}
	
	dev.c(101);
	
	sleep(20);
	

	while(dev.r(192) != LCSU_DS_Ready)
	{
		sleep(50);
		
		if(dev.r(192) == LCSU_DS_Fault)
		{
			PrintStatus();
			return false;
		}
	}

	if(lcsu_print)
	{
		print("IdMeas, A: " + dev.rf(200));
		print("DAC " + Math.max.apply(null, dev.raff(6)))
	}

	if (dev.rf(196) == 1)
	{
		print("Following regulator error.");
		return false;
	}

	return true;
}

function LCSU_Start_KEI(Type, Current, Pulse_ms)
{
	var IdSc = 0;
	
	KEI_ConfigVoltageDigit(LCSU_SampleRate);
	KEI_MakeTestBuffer(LCSU_SampleRate, Pulse_ms * 1000);
	KEI_ConfigVoltageDigitEdgeTrigger();
	KEI_SetVoltageDigitRange(Current * LCSU_Rshunt);
	KEI_VoltageDigitTriggerLevel(Current * LCSU_Rshunt / 2);
	KEI_ActivateTrigger();

	sleep(500);
	LCSU_Start(Type, Current, Pulse_ms)

	if(Type == 0 || Type == 1)
		IdSc = (KEI_ReadArrayMaximum() / LCSU_Rshunt).toFixed(2);

	if(Type == 2)
		IdSc = (KEI_ReadArrayTrapeze() / LCSU_Rshunt).toFixed(2);

	var IdUnit = dev.rf(200);
	print("IdSet, A: " + Current);
	print("IdDMM, A: " + IdSc);
	var IdSetErr = ((IdSc - Current) / Current * 100).toFixed(2);
	var IdMeasErr = ((IdUnit - IdSc) / IdSc * 100).toFixed(2);
	print("IdSetErr, %: " + IdSetErr);
	print("IdMeasErr, %: " + IdMeasErr);
	print("--------------------");
}

function LCSU_SyncTest(Current,sync_time)
{	
	dev.nid(110);
	sleep(20);

	if (dev.r(192)==LCSU_DS_Ready)
	{	
		
		dev.w(128, Current);
		dev.c(100);
		sleep(20);

		if (dev.r(192)==LCSU_DS_ConfigReady)
		{
			dev.nid(9);
			dev.w(160, sync_time);
			dev.c(11);
		}
		else
		{
			PrintStatus();
			return false;
		}
	}
	else
	{
		PrintStatus();
		return false;
	}

	return true;
}

function LCSU_ResourceTest(Current, Pulse_ms, HoursTest, Period_ms)
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
			print("Фактический промежуток между импульсами: " + actualIntervalMs + " мс (задано " + Period_ms + " мс)");
		}
		lastPulseStartMs = beforePulseMs;

		LCSU_Start(2, Current, Pulse_ms);
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

function CLCSU_Regulator(Range, OnOff) // диапазон 0,1,2; вкл (1), выкл (0)
{
	switch(OnOff)
	{
		case 0:
		{
			CLCSU_RegulatorSave(Range);
			dev.wf(53,1);
			print("Regulator off. Range: " +Range);
			break;
		}
		case 1:
		{
			CLCSU_RegulatorCall(Range);
			dev.wf(53,0);
			print("Regulator on. Range: " +Range);
			break;
		}
		default:
		{
			print("Incorrect value");
			break;
		}
	}
}

function CLCSU_RegulatorSave(Range)
{
	switch(Range)
	{
		case 0:
			{
				clcsu_RegulatorProp0 = dev.rf(44);
				clcsu_RegulatorIntegral0 = dev.rf(45);
				dev.wf(44,0);
				dev.wf(45,0);
				break;
			}
		case 1:
			{
				clcsu_RegulatorProp1 = dev.rf(46);
				clcsu_RegulatorIntegral1 = dev.rf(47);
				dev.wf(46,0);
				dev.wf(47,0);
				break;
			}
		case 2:
			{
				clcsu_RegulatorProp2 = dev.rf(70);
				clcsu_RegulatorIntegral2 = dev.rf(71);
				dev.wf(70,0);
				dev.wf(71,0);
				break;
			}
			default:
			{
				print("Incorrect value");
				break;
			}
	}
}
function CLCSU_RegulatorCall(Range)
{
	switch(Range)
	{
		case 0:
			{
				dev.wf(44,clcsu_RegulatorProp0);
				dev.wf(45,clcsu_RegulatorIntegral0);
				break;
			}
		case 1:
			{
				dev.wf(46,clcsu_RegulatorProp1);
				dev.wf(47,clcsu_RegulatorIntegral1);
				break;
			}
		case 2:
			{
				dev.wf(70,clcsu_RegulatorProp2);
				dev.wf(71,clcsu_RegulatorIntegral2);
				break;
			}
			default:
			{
				print("Incorrect value");
				break;
			}
	}
}

function CLCSU_SaveCSV_EP(NumberEP)
{
	var Suffix = GetDateTimeSuffix();

	switch(NumberEP)
	{
		case 1:
			{
				var EP1 = dev.raff(1);
				save("data/LCSU_EP1_CURRENT_" + Suffix + ".csv", EP1);
				break;
			}
		case 2:
			{
				var EP2 = dev.raff(2);
				save("data/LCSU_EP2_BATTERY_VOLTAGE_" + Suffix + ".csv", EP2);
				break;
			}
		case 3:
			{
				var EP3 = dev.raff(3);
				save("data/LCSU_EP3_REGULATOR_OUTPUT_" + Suffix + ".csv", EP3);
				break;
			}
		case 4:
			{
				var EP4 = dev.raff(4);
				save("data/LCSU_EP4_REGULATOR_ERR_" + Suffix + ".csv", EP4);
				break;
			}
		case 5:
			{
				var EP5 = dev.raff(5);
				save("data/LCSU_EP5_CUR_TABLE_" + Suffix + ".csv", EP5);
				break;
			}
		case 6:
			{
				var EP6 = dev.raff(6);
				save("data/LCSU_EP6_DAC_RAW_DATA_" + Suffix + ".csv", EP6);
				break;
			}
		case 7:
			{
				var EP7 = dev.raff(7);
				save("data/LCSU_EP7_ADC_FLATTOP_LAST_RAW_DATA_" + Suffix + ".csv", EP7);
				break;
			}
		case 8:
			{
				var EP8 = dev.raff(8);
				save("data/LCSU_EP8_ADC_FLATTOP_DATA_COUNT_" + Suffix + ".csv", EP8);
				break;
			}
		default:
			{
				print("Incorrect Number EP");
				break;
			}
	}
}

function GetDateTimeSuffix()
{
	var now = new Date();
	var datePart = Pad2(now.getDate()) + "." + Pad2(now.getMonth() + 1) + "." + now.getFullYear();
	var timePart = Pad2(now.getHours()) + "-" + Pad2(now.getMinutes());
	return datePart + "_" + timePart;
}

function Pad2(value)
{
	return (value < 10 ? "0" : "") + value;
}