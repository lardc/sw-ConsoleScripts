include("PrintStatus.js")

DS_None = 0,
DS_Fault = 1,
DS_Disabled = 2,
DS_Ready = 3,
DS_ConfigReady = 4,
DS_InProcess = 5

function LSLPC_Start(Current)
{
	// Enable power
	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
		{
			p("Напряжение на ячейках = " + dev.r(201) / 10 + " В");
			sleep(1000);			
		}
		p("Напряжение на ячейках = " + dev.r(201) / 10 + " В");
	}	
	else if (dev.r(192) == DS_Fault)	
	{
		dev.c(3);
		dev.c(1);
		while (dev.r(192) != DS_Ready)
		{
			p("Напряжение на ячейках = " + dev.r(201) / 10 + " В");
			sleep(1000);			
		}
		p("Напряжение на ячейках = " + dev.r(201) / 10 + " В");
	}

	dev.w(128, Current * 10);
	dev.c(100);
	
	while(dev.r(192) != DS_ConfigReady)
	{
		sleep(50);
		
		if(dev.r(192) == DS_Fault)
		{
			PrintStatus();
			return false;
		}
	}
	
	dev.c(101);
	
	sleep(20);
	
	while(dev.r(192) != DS_Ready)
	{
		sleep(50);
		
		if(dev.r(192) == DS_Fault)
		{
			PrintStatus();
			return false;
		}
	}
	
	return true;
}
//--------------------------

function LSLPC_Pulses(Current, N)
{
	for(i = 0; i < N; i++)
	{
		print("#" + i);
		LSLPC_Start(Current);
		
		if(anykey())
			break;
	}
}
//--------------------------

function LSLPC_ResourceTest(Current, HoursTest)
{
	var i = 1;
	var count_plot = 0;
	var MinutesInMs = 60 * 1000;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	while((new Date()).getTime() < end.getTime())
	{
		LSLPC_Start(Current);

		var left_time = new Date(end.getTime() - (new Date()).getTime());
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");

		var elapsed_time = new Date((new Date()).getTime() - start.getTime());
		if (elapsed_time.getTime() > 2 * MinutesInMs * count_plot)
		{
			pl(dev.rafs(1));
			p("Вывод графика #" + (count_plot + 1) + " спустя " + (elapsed_time.getHours() - 3) + " ч и " + elapsed_time.getMinutes() + " мин");
			count_plot++;
		}

		if (anykey()) break;

		i++;
	}
}
