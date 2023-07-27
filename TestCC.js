//
Time_AfterMovingDown 	= 1000		// in ms
Time_FillingCO2 		= 5000		// in ms
Time_AfterFillingCO2 	= 1000		// in ms
Time_FeelingBeer 		= 5000		// in ms
Time_AfterFillingBeer 	= 1000		// in ms
Time_AfterMovingUp 		= 1000		// in ms
//


function CC_Start()
{
	dev.c(1);
	
	dev.c(100);
	sleep(Time_AfterMovingDown);
	
	if(dev.r(96))
		return;
	
	dev.c(110);
	sleep(Time_FillingCO2);
	dev.c(111);
	sleep(Time_AfterFillingCO2);
	
	if(dev.r(96))
		return;
	
	dev.c(120);
	sleep(Time_FeelingBeer);
	dev.c(121);
	sleep(Time_AfterFillingBeer);
	
	dev.c(101);
	sleep(Time_AfterMovingUp);
}