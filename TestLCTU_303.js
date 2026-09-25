include("PrintStatus.js")

PrintData = 1;
CurrentCutOff = 20 // in mA

function LCTU_Power()
{
	dev.w(150,1);
	dev.c(16);
	sleep(100);
	dev.c(15);

}

function LCTU_Pulse(Voltage,PreVoltage)
{
	dev.w(128,Voltage);
	dev.w(150,1);
	dev.c(14);
	sleep(10);
	dev.c(11);
	sleep(10);
	dev.c(13);
	sleep(10);
	dev.w(150,PreVoltage);
	dev.c(19);
	sleep(10);
	dev.w(150,0);
	dev.c(13);
	sleep(10);
	dev.c(11);
	sleep(10);
	dev.c(14);
}	

function LCTU_OFF()
{
	dev.w(150,0);
	dev.c(15);
	sleep(100);
	dev.c(16);
}

function LCTU_Test()
{
	dev.w(150,1);
	dev.c(14);
	sleep(10);
	dev.c(11);
	sleep(100);
	dev.w(150,0);
	dev.c(11);
	sleep(10);
	dev.c(14);

}

function LCTU_Test2()
{
	dev.w(150,1);
	dev.c(11);
	sleep(10);
	dev.c(14);
	sleep(100);
	dev.w(150,0);
	dev.c(11);
	dev.c(14);

}

function LCTU_Test3(N)
{
	for (var i = 0; i < N ; i++)
		{
			LCTU_Test();
			sleep(500);
			if(anykey())
				break;
		}
}

function LCTU_Messure(Voltage, PreVoltage, CurrentCH)
{
	dev.w(150,CurrentCH);
	dev.w(152,1);
	dev.c(21);
	LCTU_Pulse(Voltage, PreVoltage);
	dev.w(150,CurrentCH);
	dev.w(152,0);
	dev.c(21);
}

function LCTU_Plot()
{
	a=dev.raff(1);
	plotn(a,1,"steps","Amperage", "Regulator Ig");
	a=dev.raff(2);
	plotn(a,1,"steps","Voltage", "Regulator Uce");
	a=dev.raff(4);
	plotn(a,1,"steps","Voltage", "Regulator Setpoint");
	a=dev.raff(5);
	plotn(a,1,"steps","Voltage", "Regulator Correction");
	a=dev.raff(6);
	plotn(a,1,"steps","Voltage", "Regulator Error");
	a=dev.raff(7);
	plotn(a,1,"steps","Voltage", "DacRaw");
}