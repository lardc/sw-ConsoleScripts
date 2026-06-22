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
			p('R, Ohm: ' + dev.rf(200).toFixed(1));
			p("V, V:" + dev.rf(231).toFixed(6));
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
	dev.wf(128, Voltage);
	
	if(dev.r(192) == 3)
	{
		dev.c(101);
		
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
		
		p("Iges, mA:" + dev.rf(201).toFixed(6));
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Vgs(Current)
{
	dev.wf(129, Current);
	
	if(dev.r(192) == 3)
	{
		dev.c(102);
		
		sleep(100);
		
		if(dev.r(192) == 3 && !dev.r(196))
		{
			p("Vges, V:" + dev.rf(202).toFixed(6));
			p("V, V:" + dev.rf(231).toFixed(6));
			p("I, mA:" + dev.rf(230).toFixed(6));
		}
		else
			PrintStatus();
	}
	else
		PrintStatus();
}
//--------------------

