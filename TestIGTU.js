include("PrintStatus.js")

QG_Vcutoff 	= 15
QG_Vneg		= 8

function IGTU_Iges(Voltage, CurrentRange)
{
	dev.wf(136, Voltage);
	dev.w(137,CurrentRange);
	
	if(dev.r(192) == 3)
	{
		dev.c(102);
		
		p("Start process...")
		
		sleep(dev.r(56) * 30);
		
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
		
		p("Iges, nA:" + dev.rf(204).toFixed(2));
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Vgs(Voltage, Current)
{
	dev.wf(128, Current);
	dev.wf(129, Voltage);
	
	if(dev.r(192) == 3)
	{
		dev.c(100);
		
		sleep(100);
		
		if(dev.r(192) == 3 && !dev.r(196))
		{
			p("Vgs, V:" + dev.rf(200).toFixed(4));
			p("Igs, mA:" + dev.rf(201).toFixed(2));
		}
		else
			PrintStatus();
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Qg(Ig, Tp, Vp, Ip)
{
	var OpResult = 0;
	
	dev.w(130, QG_Vcutoff)
	dev.w(131, QG_Vneg)
	dev.w(132, Ig)
	dev.w(133, Tp)
	dev.w(134, Ip)
	dev.w(135, Vp)
	
	if(dev.r(192) == 3)
	{
		dev.c(101)
		
		while(!OpResult)
		{
			OpResult = dev.r(197);
			
			if(OpResult == 2)
			{
				PrintStatus();
				return;
			}
			
			sleep(200)
		}
		
		if(dev.r(192) == 3 && !dev.r(196))
		{
			p("Qg, nQ:" + dev.rf(202).toFixed(4));
			p("Ig, mA:" + dev.rf(203).toFixed(2));
		}
		else
			PrintStatus();
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Res()
{
	if(dev.r(192) == 3)
	{
		dev.c(103);
		sleep(50);
		
		if(dev.r(197) == 1)
			p('R, Ohm: ' + dev.rf(205).toFixed(1));
		else
			PrintStatus();
	}
	else
		PrintStatus();
}
//--------------------