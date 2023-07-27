include("PrintStatus.js")
include("Common.js")

var ECDC_CB_Print = 1;

function ECDC_CB_Measure(Current, Voltage)
{
	if(dev.r(192) == 3)
	{
		w32(128, Current);
		w32(130, Voltage);
		
		dev.c(100);
		
		while(dev.r(192) == 4){sleep(10);}
		
		if(dev.r(192) == 3)
		{
			if(ECDC_CB_Print)
			{
				print("DUT Current, uA: " + r32(250));
				print("DUT Voltage, uV: " + r32(252));
				print("---------------");
				print("");
			}
		}
		
		if(dev.r(192) == 1)
			PrintStatus();
	}
	else
	{
		if(dev.r(192) != 1)
			print("Device not ready");
		else
			PrintStatus();
	}
}
//--------------------
