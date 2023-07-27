include("PrintStatus.js")
include("Common.js")

var ECDC_VB_Print = 1;

function ECDC_VB_SetOutput(OutputLine, OutputType, OutputMode, PulseTime)
{
	dev.w(128, OutputLine);
	dev.w(129, OutputType);
	dev.w(130, OutputMode);
	dev.w(131, PulseTime);
}

function ECDC_VB_Measure(Current, Voltage)
{
	if(dev.r(192) == 3)
	{
		w32(135, Current);
		w32(137, Voltage);
		
		dev.c(100);
		
		while(dev.r(192) == 4){sleep(10);}
		
		if(dev.r(192) == 3)
		{
			if(ECDC_VB_Print)
			{
				print("DUT Current, uA: " + r32(200) / 100);
				print("DUT Voltage, mV: " + r32(202));
				print("---------------");
				print("");
			}
		
			if(dev.r(192) == 1)
			PrintStatus();
		}
	}
	else
	{
		if(dev.r(192) != 1)
			print("Device not ready");
		else
			PrintStatus();
	}
}