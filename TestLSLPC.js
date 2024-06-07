include("PrintStatus.js")

// Переменные совместимости
cal_LSLPC_Compatibility = 0; // 0 - если прошивка блока на IAR, 1 - если прошивка на Atolic

if (cal_LSLPC_Compatibility)
{
	REG_DEV_STATE = 192;
	DS_None = 0;
	DS_Fault = 1;
	DS_Disabled = 2;
	DS_Ready = 3;
	DS_ConfigReady = 4;
	DS_InProcess = 5;
}
else
{
	REG_DEV_STATE = 96;
	DS_None = 0;
	DS_Fault = 1;
	DS_Disabled = 2;
	DS_BatteryCharging = 3;
	DS_Ready = 4;
	DS_ConfigReady = 7;
	DS_InProcess = 8;
}

function LSLPC_Start(Current)
{
	// Enable power
	if(dev.r(REG_DEV_STATE) == DS_None)
	{
		dev.c(1);
		while (dev.r(REG_DEV_STATE) != DS_Ready)
		{
			sleep(1000);
			if(anykey())
				return false;
		}
	}

	if (dev.r(REG_DEV_STATE) == DS_Fault)	
	{
		p("Fault");
		return false;
	}

	if(cal_LSLPC_Compatibility == 0)
		if(dev.r(REG_DEV_STATE) == DS_BatteryCharging)
		{
			while (dev.r(REG_DEV_STATE) != DS_Ready)
			{
				sleep(1000);
				if(anykey())
					return false;
			}
		}


	cal_LSLPC_Compatibility == 1 ? dev.w(128, Current * 10) : dev.w(64, Current);
	dev.c(100);
	
	while(dev.r(REG_DEV_STATE) != DS_ConfigReady)
	{
		sleep(1000);
		if(anykey())
			return false;
		
		if(dev.r(REG_DEV_STATE) == DS_Fault)
		{
			PrintStatus();
			return false;
		}
	}
	
	dev.c(101);
	
	sleep(20);
	
	while(dev.r(REG_DEV_STATE) != DS_Ready)
	{
		sleep(100);
		
		if(dev.r(REG_DEV_STATE) == DS_Fault)
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
		if (elapsed_time.getTime() > 10 * MinutesInMs * count_plot)
		{
			pl(dev.rafs(1));
			p("Вывод графика #" + (count_plot + 1) + " спустя " + (elapsed_time.getHours() - 3) + " ч и " + elapsed_time.getMinutes() + " мин");
			count_plot++;
		}

		if (anykey()) break;

		i++;
	}
}
