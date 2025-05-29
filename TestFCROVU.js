include("PrintStatus.js")
include("CalGeneral.js")
include("SiC_Calc.js")

cfdvdt_RatePoint = [20, 50, 100, 200]

function fdVdt_DiagPulse(Gate, Current, Time)
{
	dev.w(150, Time)
	dev.w(151, Gate)
	if (Current < 400)
		dev.c(121)
	else if (Current < 800)
		dev.c(122)
	else if (Current < 1200)
		dev.c(123)
	else
		dev.c(124)
	sleep(50)
	dev.c(120)
	sleep(50)
	dev.c(129)
	dev.c(130)
	dev.w(150, 0)
	dev.w(151, 0)
	dev.c(129)

}
//fdVdt_StartPulse(20, 100, 0)
function fdVdt_StartPulse(Rate, Current, Sync)
{
		dev.w(129,Rate * 10)
		dev.w(130,Current)
	if (Sync)
		dev.c(10)
	else
		dev.c(100)
	sleep(500)
}

function fdVdt_ResTest(Pulse)
{
	Num = Pulse / cfdvdt_RatePoint.length
	for (var i = 0; i < Num ; i++)
	{
		for (var j = 0; j < cfdvdt_RatePoint.length; j++)
		{	
		print("Test " + (((i * cfdvdt_RatePoint.length) + j) + 1) + " is " + Pulse ) 
		while (dev.r(192) != 3)	
		{
			sleep(100)
			p(dev.r(200))
			if(anykey()) return 0	
		}	
		fdVdt_StartPulse(cfdvdt_RatePoint[j], 1600, 0)
		sleep (1500)
		p(dev.r(200))
		
		if(anykey()) return 0
		}
	}
}