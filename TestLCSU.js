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

function LCSU_ResourceTest(Current, HoursTest)
{
	var i = 1;
	var count_plot = 0;
	var MinutesInMs = 60 * 1000;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	var RegulatorError = 0;

	while((new Date()).getTime() < end.getTime())
	{
		LCSU_Start(2,Current);
		//sleep(1000);

		RegulatorError = dev.rf(196);
		if (RegulatorError==1)
		{
			p("Following regulator error. Test stopped.")
			break;
		}

		var left_time = new Date(end.getTime() - (new Date()).getTime());
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");

		var elapsed_time = new Date((new Date()).getTime() - start.getTime());
		if (elapsed_time.getTime() > 10 * MinutesInMs * count_plot)
		{
			pl(dev.raff(1));
			p("Вывод графика #" + (count_plot + 1) + " спустя " + (elapsed_time.getHours() - 3) + " ч и " + elapsed_time.getMinutes() + " мин");
			count_plot++;
		}

		if (anykey()) break;

		i++;
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