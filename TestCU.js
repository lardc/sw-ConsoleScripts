include("PrintStatus.js")

var Count_CUOutputExtensionBoard = 2; // Кол-во ЭМ CUOutputExtensionBoard в блоке

function CU_SetPin(PinID, Action, ResetMode)
{
	// clear all pins
	if (ResetMode != 0)
	{
		dev.w(67, 0);
		for (i = 0; i < Count_CUOutputExtensionBoard; i++)
		{
			dev.w(66, i);
			dev.c(103);
		}
		
		sleep(500);
	}
	
	// set pin
	dev.w(64, PinID);
	dev.w(65, Action);
	dev.c(102);
	dev.c(104);
}

function CU_TestInd (repeat)
{
	for (i = 0; i < repeat; i++)
	{
		dev.c(50);
		sleep(1500);
	}	
}