include("PrintStatus.js")

// 0 — прошивка IAR, 1 — прошивка Atolic.
// LSLPC_Start и CLSLPC_TekInit читают текущее значение.
if (typeof clslpc_Compatibility == "undefined")
	clslpc_Compatibility = 1;

function LSLPC_ApplyCompatibility()
{
	if (clslpc_Compatibility)
	{
		LSLPC_REG_USE_LINEAR_DOWN = 130;
		LSLPC_REG_DEV_STATE = 192;
		LSLPC_REG_PROBLEM = 196;
		LSLPC_DS_None = 0;
		LSLPC_DS_Fault = 1;
		LSLPC_DS_Disabled = 2;
		LSLPC_DS_Ready = 3;
		LSLPC_DS_ConfigReady = 4;
		LSLPC_DS_InProcess = 5;
	}
	else
	{
		LSLPC_REG_DEV_STATE = 96;
		LSLPC_REG_PROBLEM = 100;
		LSLPC_DS_None = 0;
		LSLPC_DS_Fault = 1;
		LSLPC_DS_Disabled = 2;
		LSLPC_DS_BatteryCharging = 3;
		LSLPC_DS_Ready = 4;
		LSLPC_DS_ConfigReady = 7;
		LSLPC_DS_InProcess = 8;
	}
}

LSLPC_ApplyCompatibility();

function LSLPC_SineConfig(Current)
{
	// Enable power
	if(dev.r(LSLPC_REG_DEV_STATE) == LSLPC_DS_None)
	{
		dev.c(1);
		while (dev.r(LSLPC_REG_DEV_STATE) != LSLPC_DS_Ready)
		{
			sleep(1000);
			if(anykey())
				return false;
		}
	}

	if (dev.r(LSLPC_REG_DEV_STATE) == LSLPC_DS_Fault)	
	{
		p("Fault");
		return false;
	}

	if(clslpc_Compatibility == 0)
		if(dev.r(LSLPC_REG_DEV_STATE) == LSLPC_DS_BatteryCharging)
		{
			while (dev.r(LSLPC_REG_DEV_STATE) != LSLPC_DS_Ready)
			{
				sleep(1000);
				if(anykey())
					return false;
			}
		}


	clslpc_Compatibility == 1 ? dev.w(128, Current * 10) : dev.w(64, Current);
	sleep(100)
	dev.c(100);
	
	while(dev.r(LSLPC_REG_DEV_STATE) != LSLPC_DS_ConfigReady)
	{
		sleep(1000);
		if(anykey())
			return false;
		
		if(dev.r(LSLPC_REG_DEV_STATE) == LSLPC_DS_Fault || dev.r(LSLPC_REG_PROBLEM) != 0)
		{
			PrintStatus();
			return false;
		}
	}

	if(dev.r(LSLPC_REG_DEV_STATE) == LSLPC_DS_Fault || dev.r(LSLPC_REG_PROBLEM) != 0)
	{
		PrintStatus();
		return false;
	}
	
	return true;
}

function LSLPC_Start(Current)
{
	LSLPC_ApplyCompatibility();
	if (!LSLPC_SineConfig(Current))
		return false;

	dev.c(101);
	sleep(20);
	
	while(dev.r(LSLPC_REG_DEV_STATE) != LSLPC_DS_Ready)
	{
		sleep(100);
		
		if(dev.r(LSLPC_REG_DEV_STATE) == LSLPC_DS_Fault)
		{
			PrintStatus();
			return false;
		}

		if(anykey())
			return false;
	}
	
	return true;
}
//--------------------------

function LSLPC_HoursMinutes(ms)
{
	if (ms < 0)
		ms = 0;

	var totalMinutes = Math.floor(ms / 60000);
	var hours = Math.floor(totalMinutes / 60);
	var minutes = totalMinutes % 60;
	return hours + " ч и " + minutes + " мин";
}

function LSLPC_Pulses(Current, N)
{
	for(var i = 0; i < N; i++)
	{
		print("#" + i);
		if (!LSLPC_Start(Current))
			break;

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
		if (!LSLPC_Start(Current))
			break;

		var now = (new Date()).getTime();
		print("#" + i + " Осталось " + LSLPC_HoursMinutes(end.getTime() - now));

		var elapsed = now - start.getTime();
		if (elapsed > 10 * MinutesInMs * count_plot)
		{
			pl(dev.rafs(1));
			p("Вывод графика #" + (count_plot + 1) + " спустя " + LSLPC_HoursMinutes(elapsed));
			count_plot++;
		}

		if (anykey()) break;

		i++;
	}
}
