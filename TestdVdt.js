include("PrintStatus.js")
include("CalGeneral.js")

// DeviceState
DS_None = 0;
DS_Fault = 1;
DS_Disabled = 2;
DS_Ready = 3;
DS_InProcess = 4;

// Voltage settings for unit test
dvdt_Vmin = 500;
dvdt_Vmax = 4500;
dvdt_Vstp = 500;
dvdt_Points = 10;

dvdt_DeviderRate = 10; 		// Делитель скорости. Установить равным 1 если плата без диапазонов 

dvdt_RatePoint = [100, 200, 320, 500, 1000, 1600, 2000];

function _dVdt_Active()
{
	if (dev.r(192) == 4)
		return 1;
	else if (dev.r(192) == 3)
		return 0;
	else if (dev.r(192) == 1)
	{
		PrintStatus();
		return;
	}
}

function dVdt_Start()
{
	for (var i = 101; i <= 105; i++)
	{
		dev.c(i);
		while (_dVdt_Active()) { sleep(20); };
	}
}

function dVdt_WarmUp(UsePulse)
{
	var counter = 0;
	
	while(!anykey())
	{
		dev.w(128, 1000);
		dev.c(10);
		if (UsePulse) dVdt_Start();
		sleep(1000);
		dVdt_PrintInfo();
		sleep(10000);
		
		dev.w(128, 4000)
		dev.c(10);
		sleep(3000);
		if (UsePulse) dVdt_Start();
		sleep(1000);
		dVdt_PrintInfo();
		sleep(10000);
		
		print("--------");
		print(++counter);
		print("--------");
	}
}

function dVdt_StartRange()
{
	var VoltageArray = CGEN_GetRange(dvdt_Vmin, dvdt_Vmax, dvdt_Vstp);
	
	for (var i = 0; i < VoltageArray.length; i++)
	{
		dev.w(128, VoltageArray[i]);
		dVdt_Start();
		
		if (anykey()) return;
	}
}

function dVdt_PrintInfo()
{
	var i;
	
	for (i = 1; i < 7; i++)
		print("Vok#" + i + "\t" + dev.r(200 + i));
		
	for (i = 1; i < 7; i++)
		print("V  #" + i + "\t" + dev.r(206 + i));
		
	for (i = 1; i < 7; i++)
		print("St #" + i + "\t" + dev.r(212 + i));
		
	PrintStatus();
}

function dVdt_CellReadRegs(CellID)
{
	var i;
	
	dev.w(185, CellID);
	
	for (i = 1; i <= 4; i++)
	{
		dev.w(186, i);
		dev.c(120);
		print(i + " = " + dev.r(225));
	}
	print("----");
	for (i = 10; i <= 13; i++)
	{
		dev.w(186, i);
		dev.c(120);
		print(i + " = " + dev.r(225));
	}
	print("----");
	for (i = 14; i <= 15; i++)
	{
		dev.w(186, i);
		dev.c(120);
		print(i + " = " + dev.r(225));
	}
}

function dVdt_PrintGateV()
{
	for (var i = 0; i < 6; i++)
	{
		print("Cell " + (i + 1) + ": " + dev.r(230 + i));
	}
}

function dVdt_CellSetV(CellID, Voltage)
{
	dVdt_CellWriteReg(CellID, 1, Voltage);
	dVdt_CellCall(CellID, 10);
}

function dVdt_CellSetGate(CellID, Gate)
{
	dVdt_CellWriteReg(CellID, 2, Gate);
	dVdt_CellCall(CellID, 112);
}

function dVdt_SelectRange(CellID, Range)
{
	dVdt_CellWriteReg(CellID, 4, Range);
	dVdt_CellCall(CellID, 10);
}

// Basic functions

function dVdt_CellReadReg(CellID, Reg)
{
	dev.w(185, CellID);
	dev.w(186, Reg);
	dev.c(120);
	
	return dev.r(225);
}

function dVdt_CellWriteReg(CellID, Reg, Value)
{
	dev.w(185, CellID);
	dev.w(186, Reg);
	dev.w(187, Value);
	dev.c(121);
}

function dVdt_CellCall(CellID, Action)
{
	dev.w(185, CellID);
	dev.w(186, Action);
	dev.c(122);
}

function dVdt_CellPulse(CellID, Voltage, Gate, Range, NoShutdown)
{
	dVdt_CellCall(CellID, 1);

	if(Range != 3)
		dVdt_SelectRange(CellID, Range);	
	dVdt_CellSetV(CellID, Voltage);
	
	while (dVdt_CellReadReg(CellID, 14) == 0)
	{
		if (anykey()) return 0;
		sleep(100);
	}
	
	dVdt_CellSetGate(CellID, Gate);
	sleep(500);
	dev.c(114);

	while(_dVdt_Active()) sleep(50);
	
	if ((typeof NoShutdown == 'undefined') || NoShutdown == 0)
	{
		sleep(500)
		dVdt_CellCall(CellID, 2);
	}
}

function dVdt_IdleShortTestDetector()
{
	var SetV = CGEN_GetRange(dvdt_Vmin, dvdt_Vmax, (dvdt_Vmax - dvdt_Vmin) / 4);

	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}

	for (var i = 0; i < dvdt_RatePoint.length; i++)
	{
		dev.w(129, dvdt_RatePoint[i] * dvdt_DeviderRate);
		for (var j = 0; j < SetV.length; j++)
		{
			dev.w(128, SetV[j]);
			dev.c(100);
			while(_dVdt_Active()) sleep(50);
			
			p("Скорость:" + dvdt_RatePoint[i] + " В/мкс");
			p("Напряжение:" + SetV[j] + " В");

			sleep(300);
			if (dev.r(198) == 1)
			{
				p("Режим ХХ");
			}
			else
			{
				p("Режим КЗ");
			}
			//while(anykey() == 0);

			p("______________");

			if (anykey()) return;
		}	

	}
}

function dVdt_StartPulse(Voltage, Rate)
{
	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}

	dev.w(128, Voltage);
	dev.w(129, Rate * dvdt_DeviderRate);
	dev.c(100);
	while(_dVdt_Active()) sleep(50);
	if (dev.r(197) == 2)
		print("Test Failed");
	else if (dev.r(197) == 1)
		print("Test OK");
}

function dVdt_ResourceTest(dVdt_resource_test, random_test_dut)
{
	var VoltageArray = CGEN_GetRangeNew(dvdt_Vmin, dvdt_Vmax, dvdt_Points);
	var random = 0;
	var cntDone = 0;
	var cntFailedVerify = 0;
	
	// Re-enable power
	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
		sleep(100);
	}	
	else	
	{
		dev.c(2);
		while (dev.r(192) != DS_None)
			sleep(100);

		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}
	
	var i = 0;
	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + dVdt_resource_test;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);								// Задаем новое количество часов в дату

	while((new Date()).getTime() < today.getTime())
	{
		for (var k = 0; k < VoltageArray.length; k++)
		{
			dev.w(128, VoltageArray[k]);
			for (var i = 0; i < dvdt_RatePoint.length; i++)
			{
				sleep(1000);
				dev.w(129, dvdt_RatePoint[i] * dvdt_DeviderRate)

				if (random_test_dut)
				{
					random = Math.round(Math.random())
					dev.w(150, random);
					dev.c(117);
					sleep(1000);
					p("random = " + random);
				}

				dev.c(100);
				sleep(1000);
				while(_dVdt_Active()) sleep(50);
				
				print("dVdt set,  V/us: " + dvdt_RatePoint[i]);
				print("Vset,         V: " + VoltageArray[k]);
				if (dev.r(197) == 2)
					print("Test Failed");
				else if (dev.r(197) == 1)
					print("Test OK");

				if((random == 1 && dev.r(197) == 1) || (random == 0 && dev.r(197) == 2))
					cntFailedVerify++;
				
				print("Кол-во неудачных тестов = " + cntFailedVerify);
				cntDone++;
				var left_time = new Date((today.getTime()) - ((new Date()).getTime()));
				print("#" + cntDone + " Осталось " + (left_time.getHours()-3) + " ч и " + left_time.getMinutes() + " мин");

				if (anykey())
				{
					print("Stopped from user!");
					// Power disable
					if (random_test_dut)
					{
						dev.w(150, 0);
						dev.c(117);
					}

					dev.c(2);
					return;
				}
			}
		}
	}

	// Power disable
	if (random_test_dut)
	{
		dev.w(150, 0);
		dev.c(117);
	}

	dev.c(2);
}
