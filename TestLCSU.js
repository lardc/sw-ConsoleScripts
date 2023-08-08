include("PrintStatus.js")

DS_None = 0,
DS_Fault = 1,
DS_Disabled = 2,
DS_Ready = 3,
DS_ConfigReady = 4,
DS_InProcess = 5

function LCSU_Start(Current)
{
	// Enable power
	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
		{
			p("Напряжение на ячейках = " + dev.r(201) + " В");
			sleep(1000);			
		}
		p("Напряжение на ячейках = " + dev.r(201) + " В");
	}	
	else if (dev.r(192) == DS_Fault)	
	{
		dev.c(3);
		dev.c(1);
		while (dev.r(192) != DS_Ready)
		{
			p("Напряжение на ячейках = " + dev.r(201) + " В");
			sleep(1000);			
		}
		p("Напряжение на ячейках = " + dev.r(201) + " В");
	}

	dev.w(128, Current);
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