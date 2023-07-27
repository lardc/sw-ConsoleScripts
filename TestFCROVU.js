include("PrintStatus.js")
include("CalGeneral.js")

function fdVdt_DiagPulse(Gate)
{
	dev.w(151, Gate);
	sleep(50);
	dev.c(120);
	sleep(50);
	dev.c(129);
}

function fdVdt_StartPulse(Rate, Current)
{
	dev.w(129, Rate * 10);
	dev.c(10);
	if(Current == 1)
		dev.c(121);
	else if (Current == 2)
		dev.c(122);
	else if (Current == 3)
		dev.c(123);
}
