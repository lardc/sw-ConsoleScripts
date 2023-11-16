include("PrintStatus.js")

DS_None				= 0
DS_Fault			= 1
DS_Disabled			= 2
DS_BatteryCharge	= 3
DS_Ready			= 4
DS_InProcess		= 5

GateVoltage 	= 10;	// V
//
SVTU_Print = 1;

function SVTU_StartMeasure(Current)
{
	dev.w(128, Current);
	
	var start = new Date();
	if(dev.r(192) != DS_Ready)
	{
		if (dev.r(192) == DS_Fault)
		{
			PrintStatus();
			dev.c(3);
			p("Сброшен Fault");
		}

		if (dev.r(192) == DS_None || dev.r(192) == DS_Disabled)
			dev.c(1);

		while (dev.r(192) != DS_Ready)
		{
			var end = new Date();
			pinline('\rВремя заряда, с: ' + (end - start) / 1000);
			sleep(100);
		}
		p("");
	}

	if(anykey()) return 0;

	if(dev.r(192) == DS_Ready)
	{
		dev.c(100);
		while(dev.r(192) != DS_Ready){sleep(500);}
		
		if(SVTU_Print)
		{			
			var Current = dev.rf(201);
			
			print("DutVoltage, mV : " + dev.rf(200));
			print("DutCurrent, A  : " + Current);
			print("GateVoltage, mV: " + dev.rf(202));
			print("---------------------------");
		}
		
		return 1;
	}
	else
		PrintStatus();
	
	return 0;
}
//--------------------------

function SVTU_ResourceTest(Current_R0, Current_R1, HoursTest)
{
	csv_array = [];

	var counter = 0;
	var i = 1;
	var count_plot = 0;
	var MinutesInMs = 60 * 1000;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	csv_array.push("N ; Utm, mV; Itm, A; Ugt, mV; Igt, mA; Hours ; Minutes; Seconds");

	while((new Date()).getTime() < end.getTime())
	{	
		if (!(counter%2))
		{
			SVTU_StartMeasure(Current_R0);
		}
		else
		{
			SVTU_StartMeasure(Current_R1);
		}
		counter++;

		dev.co(10);
		Problem = dev.rf(196);
		if (Problem)
		{
			print("LCSU FOLLOWING ERROR!");
			dev.co(12);
			break;
		}
		else 
			dev.co(12);


		var left_time = new Date(end.getTime() - (new Date()).getTime());
		var now_time = new Date();
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");

		var elapsed_time = new Date((new Date()).getTime() - start.getTime());
		if (elapsed_time.getTime() > 10 * MinutesInMs * count_plot)
		{
			pl(dev.raff(1));
			p("Вывод графика #" + (count_plot + 1) + " спустя " +
				(elapsed_time.getHours() - 3) + " ч и " + elapsed_time.getMinutes() + " мин");

			count_plot++;
		}

		if (anykey()) break;

		csv_array.push( i + ";" + dev.r(198) + ";" + (dev.r(206) + dev.r(205) / 10) + ";" +
			dev.r(202) + ";" + dev.r(203) + ";" + now_time.getHours() +  ";" +
			now_time.getMinutes() + ";" + now_time.getSeconds());

		save("data/SVTU_TestUTM" + end.getTime() + ".csv", csv_array);

		i++;
	}
}
//--------------------------
