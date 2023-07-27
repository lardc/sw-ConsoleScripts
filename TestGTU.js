include("PrintStatus.js")

gtu_diag = 1;
gtu_plot = 0;
gtu_pure_vgt = 1;
gtu_hold_strike = 0;

gtu_igt = [];
gtu_vgt = [];
gtu_res = [];
gtu_ih = [];
gtu_il = [];

function GTU_Kelvin()
{
	if (gtu_diag) print("#Kelvin test");
	dev.c(100);
	while(dev.r(192) == 3) sleep(50);
	
	if (gtu_diag)
	{
		print("#Test complete code: " + dev.r(197));
		if (dev.r(197) == 2) print("#Problem: " + dev.r(196));
		
		print("CC to CP (211): " + dev.r(211));
		print("AP to CP (212): " + dev.r(212));
		print("CP to AP (213): " + dev.r(213));
		print("AC to CC (214): " + dev.r(214));
	}
	else
	{
		if (dev.r(211) == 1 && dev.r(212) == 0 && dev.r(213) == 0 && dev.r(214) == 1)
			print("Kelvin  : OK");
		else
			print("Kelvin  : FAIL");
	}

	if (gtu_diag) 
	{
		if ((dev.r(211) == 1) && (dev.r(212) == 0) && (dev.r(213) == 0) && (dev.r(214) == 1))
			print("Test result: OK");
		else
			print("Test result: FAILED");
	}
}

function GTU_Gate()
{
	dev.w(128, gtu_pure_vgt);
	
	if (gtu_diag) print("\n#IGT VGT");
	dev.c(101);
	while(dev.r(192) == 4) sleep(50);
	
	if (gtu_diag)
	{
		print("#Test complete code: " + dev.r(197));
		if (dev.r(197) == 2) print("#Problem: " + dev.r(196));
	}
	
	var igt = (dev.r(199) + dev.r(232) / 1000).toFixed(2);
	print("Igt,  mA: " + igt);
	print("Vgt,  mV: " + dev.r(200));
	
	gtu_igt.push(dev.r(199));
	gtu_vgt.push(dev.r(200));
	
	if (gtu_plot)
	{
		plot(dev.rafs(1), 1, 0);
		plot(dev.rafs(2), 1, 0);
	}
}

function GTU_Res()
{
	if (gtu_diag) print("\n#Gate resistance");
	dev.c(104);
	while(dev.r(192) == 7) sleep(50);
	
	if (gtu_diag)
	{
		print("#Test complete code: " + dev.r(197));
		if (dev.r(197) == 2) print("#Problem: " + dev.r(196));
	}
	
	print("Res, Ohm: " + dev.r(203) / 10);
	
	gtu_res.push(dev.r(203) / 10);
}

function GTU_Holding()
{
	if (gtu_diag) print("\n#Holding current");
	dev.w(129, gtu_hold_strike);
	dev.c(102);
	while(dev.r(192) == 5) sleep(50);
	
	if (gtu_diag)
	{
		print("#Test complete code: " + dev.r(197));
		if (dev.r(197) == 2) print("#Problem: " + dev.r(196));
	}
	
	print("Ih,   mA: " + dev.r(201));
	
	gtu_ih.push(dev.r(201));
	
	if (gtu_plot) plot(dev.rafs(1), 1, 0);
}

function GTU_Latching()
{
	if (gtu_diag) print("\n#Latching current");
	dev.c(103);
	while(dev.r(192) == 6) sleep(50);
	
	if (gtu_diag)
	{
		print("#Test complete code: " + dev.r(197));
		if (dev.r(197) == 2) print("#Problem: " + dev.r(196));
	}
	
	print("Il,   mA: " + dev.r(202));
	
	gtu_il.push(dev.r(202));
}

function GTU_ResetA()
{
	gtu_igt = [];
	gtu_vgt = [];
	gtu_res = [];
	gtu_ih = [];
	gtu_il = [];
}

function GTU_All(Num, Pause)
{
	try
	{
		for (var i = 0; i < Num; i++)
		{
			if (Num > 1) print("Test #" + (i + 1));
			
			GTU_Kelvin();
			GTU_Gate();
			GTU_Res();
			GTU_Holding();
			GTU_Latching();
			
			print("-------------");
			
			sleep(Pause);
			if (anykey()) return;
		}
	}
	catch (e)
	{
		print("\n#Operation unsuccessful");
		print("#Status");
		PrintStatus();
	}
}

function GTU_SetKelvin(High, Low)
{
	dev.w(160, High);
	dev.w(161, Low);
	dev.c(13);
}

function GTU_Plot()
{
	plot(dev.rafs(1), 1, 0); sleep(200);
	plot(dev.rafs(2), 1, 0);
}

function GTU_PlotResults()
{
	plot(gtu_igt, 1, 0); sleep(200);
	plot(gtu_vgt, 1, 0); sleep(200);
	plot(gtu_res, 1, 0); sleep(200);
	plot(gtu_ih, 1, 0); sleep(200);
	plot(gtu_il, 1, 0);	
}

function GTU_PulseX(Time, Current, CMD)
{
	dev.w(140, Current);
	dev.w(141, Time);
	dev.c(CMD);
	
	var state;
	do
	{
		state = dev.r(192);
		sleep(50);
	}
	while (state >= 3);
	
	print("Ical, mA: " + dev.r(204));
	print("Vcal, mV: " + dev.r(205));
}

function GTU_PulseGate(Time, Current)
{
	GTU_PulseX(Time, Current, 110);
}

function GTU_PulsePow(Time, Current)
{
	GTU_PulseX(Time, Current, 111);
}

