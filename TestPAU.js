

function PAU_Start(Channel, Range)
{
	if(dev.r(192) == 3)
	{
		dev.w(128, Channel);
		dev.wf(129, Range);
		dev.c(101);
		
		while(dev.r(192) == 4){}
		
		if(dev.r(192) == 3)		
			p("I, mA: " + dev.rf(200));
		else
			PrintStatus();
	}
	else
		PrintStatus();
}
//--------------------------------------



TestPoints = 50;

ReadVoltage = [];
ReadCurrent = [];

CurrentMin = 0;
CurrentMax = 0;
dI = 0;

function PAU_Collect()
{	
	ReadVoltage = [];
	ReadCurrent = [];
	
	CurrentMin = 0;
	CurrentMax = 0;
	
	for(i = 0; i < TestPoints; i++)
	{
		p("#" + (i + 1));
		PAU_Start(1, 0.001, 100);
		
		sleep(500);
		
		ReadCurrent[i] = dev.rf(200);
		
		if(!CurrentMax || ReadCurrent[i] > CurrentMax)
			CurrentMax = ReadCurrent[i];
		
		if(!CurrentMin || ReadCurrent[i] < CurrentMin)
			CurrentMin = ReadCurrent[i];
		
		if(anykey())
			break;
		
		p("");
	}
	
	dI = CurrentMax - CurrentMin;
	
	p("");
	p("dI, na	:" + dI * 1e6);
	
	pl(ReadCurrent);
}