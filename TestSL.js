include("PrintStatus.js")

sl_i = [];
sl_v = [];
sl_print = 1;
sl_rep = 1;

function _SL_Active()
{
	var _status = dev.r(192);
	if (_status == 3 || _status == 5)
	{
		return 1;
	}
	else
		return 0;
}

function SL_Start(Num, Sleep)
{
	for (var i = 0; i < Num; i++)
	{
		print("#" + (i + 1));
		
		dev.c(100);
		while (_SL_Active()) { sleep(50); };
		SL_getVal();
		
		sleep(Sleep);
		
		if (anykey()) return;
	}
}

function SL_Sin(Amplitude)
{
	dev.w(128, 1);
	dev.w(140, Amplitude);
	dev.w(141, 10000);
	dev.w(160, sl_rep);
	dev.c(100);
	
	while (_SL_Active()) { sleep(50); };
	
	if (sl_print)
	{
		print("Sync, us: " + dev.r(207));
		print("Iset   A: " + Amplitude);
	}
	return SL_getVal();
}

function SL_Ramp(Amplitude, Duration)
{
	dev.w(128, 0);
	dev.w(129, Amplitude);
	dev.w(130, Duration);
	dev.c(100);
	
	while (_SL_Active()) { sleep(50); };	
	return SL_getVal();
}

function SL_PlotError()
{
	Iact = dev.ras(1, 1250);
	Iset = dev.ras(4, 1250);
	
	N = Iset.length;
	if (N > 5) N = N - 5;
	
	error = Iset;
	
	for (var i = 0; i < N; i++)
		error[i] = error[i] - Iact[i];
	
	plot(Iact, 1, 0);	
	plot(error, 1, 0);
}

function SL_Cells()
{
	mask = dev.r(240);
	for (var i = 0; i < 5; i++)
		if ((mask & (1 << i)) != 0)
			print("Cell" + (i + 1) + " - OK");
		else
			print("Cell" + (i + 1) + " - None");
}

function SL_PrintV()
{
	mask = dev.r(240);
	for (var i = 0; i < 5; i++)
		if ((mask & (1 << i)) != 0)
		{
			print("Cell" + (i + 1) + " V1 = " + (dev.r(210 + i * 2) / 10));
			print("Cell" + (i + 1) + " V2 = " + (dev.r(210 + i * 2 + 1) / 10));
		}
}

function SL_Test(RampTime, DutyPWM, Plate)
{
	dev.w(128, 3);
	dev.w(3, 1500);
	
	dev.w(0, RampTime);
	dev.w(1, DutyPWM);
	dev.w(2, Plate);
	
	dev.c(100);
	while (_SL_Active()) { sleep(50); };
}

function SL_Plot()
{
	plot(dev.rafs(1), 50, 0); sleep(200);
	plot(dev.rafs(2), 50, 0);
}

function SL_PlotEx()
{
	plot(dev.rafs(11), 2, 0); sleep(200);
	plot(dev.rafs(12), 2, 0);
}

function SL_PlotError()
{
	var current = dev.rafs(1);
	var setup = dev.rafs(4);
	var err = [];
	
	for (var i = 0; i < current.length - 5; i++)
		err[i] = setup[i] - current[i];
	
	plot(current, 50, 0);
	plot(err, 50, 0);
}

function SL_getVal()
{
	var v = dev.r(198);
	var i = dev.r(206);
	
	sl_i[sl_i.length] = i;
	sl_v[sl_v.length] = v;
	
	if (sl_print)
	{
		print("Vtm,  mV: " + v);
		print("Itm,   A: " + i);
		print("-------------");
	}
	
	return {v : v, i : i};
}

function SL_RejTest(Num, Value)
{
	for (var i = 0; i < Num; i++)
	{
		dev.w(170, Value);

		print("#" + (i + 1));
		dev.c(16);
		print("Result U: 	" + dev.r(246));
		print("Return value U: " + dev.r(247));
		sleep(200);
		
		dev.c(17);
		print("Result I: 	" + dev.r(246));
		print("Return value I: " + dev.r(247));
		sleep(200);
		print("-----------------");
		
		if (anykey()) return;
	}
}

function SL_ResetA()
{
	sl_i = [];
	sl_v = [];
}
