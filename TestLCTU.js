include("PrintStatus.js")

PrintData = 1;
CurrentCutOff = 20 // in mA

function LCTU_Start(Voltage, PulseWidth)
{
	if(dev.r(192) == 3)
	{
		dev.w(128, Voltage);
		dev.wf(129, CurrentCutOff);
		dev.w(130, PulseWidth);
		dev.c(100);
		
		sleep(500);
		
		while(dev.r(192) == 4)			
			sleep(10);
		
		if(dev.r(192) != 3)
		{
			PrintStatus();
			return 0;
		}
		else
		{
			if(PrintData)
			{
				p("Voltage,  V: " + dev.rf(200).toFixed(2))
				p("Current, mA: " + dev.rf(201))
			}
		}
	}
	else
	{
		PrintStatus();
		return 0;
	}
	
	return 1;
}
//-----------------------------

function LCTU_StartSeq(N)
{
	for(i = 0; i < N; i++)
	{
		if(!LCTU_Start(3300, 100))
			return;
		
		p("#" + i);
		
		if(anykey())
			break;
	}
}
//-----------------------------

function LCTU_TestOpAmp(Voltage)
{
	// Voltage содержит значения в диапазоне ЦАП (0 - 4095)	
	dev.w(150, Voltage);
	dev.c(50);
	dev.c(52);
	sleep(100);
	dev.w(150, 0);
	dev.c(52);
}
//-----------------------------