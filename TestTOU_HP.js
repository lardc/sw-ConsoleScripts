include("PrintStatus.js")

// Global definitions
GateCurrentRate = 1000;
GateCurrent = 1000;
//
tou_print = 1;
PulseToPulseDelay = 2000;
//

// TOU HP
function TOUHP_Start(N, Voltage, Current)
{
	for(i = 0; i < N; i++)
	{
		print("#" + i);
		
		TOUHP_Measure(Voltage, Current);

		if(dev.r(193) || dev.r(196))
		{
			TOUHP_PrintFault();
			break;
		}
		
		sleep(PulseToPulseDelay);
		
		if(anykey())
			break;
	}
}

function TOUHP_Measure(Voltage, Current)
{
	while(dev.r(192) != 3)
	{
		sleep(50);
		
		if(dev.r(192) == 1)
			return;
	}
		
	dev.w(128, Voltage);
	dev.w(129, Current);
	dev.w(130, GateCurrent);
	dev.w(131, GateCurrentRate);
	
	dev.c(100);
	
	sleep(100);
	
	while(dev.r(192) == 4){sleep(50);}
	
	if(tou_print)
	{
		print("Turn on, ns       = " + dev.r(252));
		print("Turn on delay, ns = " + dev.r(251));
		print("--------------");
	}
}

function TOUHP_PrintFault()
{
	print("DeviceState   	  = "+dev.r(192));
	print("FaultReason   	  = "+dev.r(193));
	print("Warning       	  = "+dev.r(195));
	print("Problem       	  = "+dev.r(196));
}

// TOCU HP
function TOCUHP_Pulse(N, Voltage, Bit)
{	
	if(dev.r(192) == 3)
	{
		dev.w(128, Voltage);
		dev.w(129, Bit);
		dev.c(100);
	
		for(i=0; i < N; i++)
		{
			while(dev.r(192) == 4){sleep(50)}
			
			if(dev.r(192) == 3)
			{
				dev.c(101);
				dev.c(102);
			}
			
			while(dev.r(192) == 4){sleep(50)}
			
			print("N          = " + i)
			print("Voltage, V = " + dev.r(200));
			print("-----------");
			
			if(anykey())
				break;
		}
	}
	else
		PrintStatus();
}

function TOCUHP_Pulse_Hz(Voltage, Bit, Hertz, Minutes)
{
	var period_ms = (1 / Hertz) * 1000;
	var start = new Date();
	var stop = new Date();
	var minutes = start.getMinutes() + Minutes;
	stop.setMinutes(minutes);
	var i = 1;
	print("Начало теста: " + new Date());

	while((new Date()).getTime() < stop.getTime())
	{
		var start_pulse = new Date();
		var stop_pulse = new Date();
		var milliseconds = start_pulse.getMilliseconds() + period_ms;
		stop_pulse.setMilliseconds(milliseconds);

		print("Импульс № " + i);
		//TOCUHP_Pulse(1, Voltage, Bit);

		while((new Date()).getTime() < stop_pulse.getTime())
		{
			if (anykey()) return;
			sleep(1);
		}

		i++;

		if (anykey()) break;
	}
	p("Конец теста: " + new Date());
}

function TOCUHP_ResourceTest(Voltage, Bit, HoursTest, Sleep)
{
	var i = 1;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	while((new Date()).getTime() < end.getTime())
	{
		TOCUHP_Pulse(1, Voltage, Bit);

		var left_time = new Date(end.getTime() - (new Date()).getTime());
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");
		sleep(Sleep);
		if (anykey()) break;

		i++;
	}
}

// TOMU HP
function TOMUHP_GatePulse(GateCurrentRate, GateCurrent)
{
	dev.w(190,1);
	dev.c(18);
	dev.c(19);
	
	dev.w(130, GateCurrent);
	dev.w(131, GateCurrentRate);
	
	dev.c(110);
}