include("PrintStatus.js")

CurrentRateArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // A/us * 100
CurrentTest = 1100;	// A
bi = 0; //счётчик
function DRCU_Debug(PWM, Range)
{
	dev.w(150, Range);
	dev.c(59);
	dev.w(150, PWM);
	dev.w(151, PWM);
	dev.c(60);
}

function DRCU_Pulse(Current, CurrentRate)
{
	dev.w(128, Current);
	dev.w(129, CurrentRate);
	
	if(dev.r(192) == 3)
	{
		dev.c(100);
		
		while(dev.r(192) != 4)
		{
			if(dev.r(192) == 1)
			{
				PrintStatus();
				return 0;
			}
		}
		
		dev.c(101);
		sleep(50);
		
		while(dev.r(192) != 3)
		{
			if(dev.r(192) == 1)
			{
				PrintStatus();
				return 0;
			}
		}
	}
	else
		if(dev.r(192) == 1)
		{
			PrintStatus();
			return 0;
		}
	
	return 1;
}
//---------------------------------------------

function DRCU_Test(N)

{
	for (var i = 0; i < N; i++)
	{
		for (var j = 0; j < 11; j++)
		{
			p("#" + (i * 11 + j) + " / "+ (i + 1) );
			p("№ dI/dt = " + CurrentRateArray[j]);
			p("----------------");
			p("");
			
			if(!DRCU_Pulse(CurrentTest, CurrentRateArray[j]))
				return;
			
			if (anykey())
				return;
		}
	}
}

function DRCU_InPsVoltageSet(CurrentRateN, Voltage)
{
	switch(CurrentRateN)
	{
		case 0:
			dev.w(52, Voltage * 10);
			break;
		case 1:
			dev.w(53, Voltage * 10);
			break;
		case 2:
			dev.w(54, Voltage * 10);
			break;
		case 3:
			dev.w(55, Voltage * 10);
			break;
		case 4:
			dev.w(56, Voltage * 10);
			break;
		case 5:
			dev.w(57, Voltage * 10);
			break;
		case 6:
			dev.w(58, Voltage * 10);
			break;
		case 7:
			dev.w(59, Voltage * 10);
			break;
		case 8:
			dev.w(60, Voltage * 10);
			break;
		case 9:
			dev.w(61, Voltage * 10);
			break;
		case 10:
			dev.w(62, Voltage * 10);
			break;
	}
}
//---------------------------------------------

function DRCU_IntPS() //периодическое включение-выключение формирования flyback
{
while(!anykey())
{
if (bi==1) {bi = 0;}  
else bi = 1; 
dev.w(150,bi);
 //p(bi);
 dev.c(54);
 sleep (5);}
 dev.w(150,0);
 dev.c(54);
}

function DRCU_SinglePS(delay) //одиночное включение-выключение формирования flyback
{ 
dev.w(150,0);
dev.c(55);
dev.w(150,1);
 print("Включение");
 dev.c(54);
 
 sleep (delay);
dev.w(150,0);
 print("Выключение");
 dev.c(54);
 sleep (100);
}

function DRCU_PSDischarge() //Включение разрядки БП
{
	dev.w(150,0);
	dev.c(55);
	
while(!anykey())

	{
	dev.w(150,1);
	dev.c(55);
	sleep(100);
	}

	dev.w(150,0);
	dev.c(55);
	
}

function DRCU_PSSetpoint(voltage)
{
	dev.w(130,voltage*10);

	while(!anykey())
	{
		p(dev.r(201));
		sleep(2000);
	}
	dev.w(130,0);
}

function CAL_DCUTestV(voltage, current, rate){
	dev.w(130,voltage*10);
	DRCU_Pulse(current,rate);
}

function DRCU_CurrentTest(){
plot(dev.rafs(1), 1, 0);
 while (dev.r(202) > 7000) {
 DRCU_Pulse(500, 2000); 
 sleep (3000); 
 if (anykey()) break
 }
 plot(dev.rafs(1), 1, 0);
}

function BL()
{
	for (var j = 0; j < 100; j++)
	{
	dev.w(129,1);
	sleep(1000);
	dev.w(129,0);
	sleep(1000);
	}
}	