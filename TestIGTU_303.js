include("PrintStatus.js")


function IGTU_Res()
{
	if(dev.r(192) == 3)
	{
		dev.c(100);
		sleep(1000);
		
		//if(dev.r(197) == 1)
		if(dev.r(192) == 3)
		{
			p('R, Ohm: ' + dev.rf(205).toFixed(3));
			p("V, V:" + dev.rf(232).toFixed(6));
			p("I, mA:" + dev.rf(230).toFixed(6));
		}
		else
			PrintStatus();
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Iges(Voltage)
{
	dev.wf(136, Voltage);
	
	if(dev.r(192) == 3)
	{
		dev.c(102);
		
		p("Start process...")
		
		sleep(dev.r(86));
		
		while(dev.r(192) != 3)
		{
			if(dev.r(192) == 1)
			{
				PrintStatus();
				return;
			}
		}
		
		if(dev.r(196) != 0)
			PrintStatus();
		
		p("Iges, A:" + dev.rf(204).toFixed(12));
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Vgs(Current)
{
	dev.wf(128, Current);
	
	if(dev.r(192) == 3)
	{
		dev.c(100);
			
		while (dev.r(192) != 3) sleep(50);
		
		if(dev.r(196) != 0)
		{
			PrintStatus();
			return;
		}
		
		p("Vges, V:" + dev.rf(200).toFixed(6));
		p("V, V:" + dev.rf(232).toFixed(6));
		p("I, mA:" + dev.rf(230).toFixed(6));
	}
}
//--------------------

