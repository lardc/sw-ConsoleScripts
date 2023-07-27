include("PrintStatus.js")

tou_print = 1;
tou_printError = 0;
counter1 = 0;
// Timings
ctou_t_on = [];
ctou_t_gd = [];
//Graph arrays
cal_TOUabs1 = [];
cal_TOUabs2 = [];
cal_TOUabs3 = [];
cal_TOUerr1 = [];
cal_TOUerr2 = [];
cal_TOUerr3 = [];

// Status check
function _TOU_Active()
{
	return ((dev.r(192) == 3) || (dev.r(192) == 5));
}

// Cycle test
function TOU_DBG(Min, Max, Step, Count)
{
	tou_min_current = Min;
	tou_max_current = Max;
	tou_step_current = Step;
	for (;Count > 0;Count--)
	{
		for(var i = tou_min_current; i <= tou_max_current; i = i + tou_step_current)
		{
			dev.w(128, i);
 			dev.c(100);
			while (_TOU_Active())
			sleep(100);
 			TOU_getVal();
 			if (anykey()) return;
 			sleep(2000);
 			while (_TOU_Active())
 				sleep(4000);
			cal_TOUabs1.push(dev.r(250));
			cal_TOUabs2.push(dev.r(251)/1000);
			cal_TOUabs3.push(dev.r(252)/1000);
		}
	}
}

//Clears graph arrays
function ResetArray()
{
cal_TOUabs1 = [];
cal_TOUabs2 = [];
cal_TOUabs3 = [];
cal_TOUerr1 = [];
cal_TOUerr2 = [];
cal_TOUerr3 = [];
}

//Pulses with graphs [A, A, A]
function TOU_DBG_Graph(Min, Max, Step)
{	
	if(anykey()) return 0;
	TOU_DBG(Min, Max, Step)
	plot((cal_TOUabs1),1,1);
	plot((cal_TOUabs2),1,1);
	plot((cal_TOUabs3),1,1);

}
// Pack of pulses with iterations with graphs [Num1, Num2, A, A, A]
function TOU_DBG_GraphIter(TimesTotal, TimesEach, Min, Max, Step) // Total cycles, every step iteration, min and max TOCU current
{	
	ResetArray();
	p(counter1>TimesTotal);
	for(counter1=0; counter1<TimesTotal;counter1++){
	if(anykey()) return 0;
	TOU_DBG(Min, Max, Step, TimesEach);
	}
	plot((cal_TOUabs1),1,1);
	plot((cal_TOUabs2),1,1);
	plot((cal_TOUabs3),1,1);
	scattern(cal_TOUabs1, cal_TOUabs2, "I_dut (A)", "tgd (us)", "Idut by tgd");
	scattern(cal_TOUabs1, cal_TOUabs3, "I_dut (A)", "tgt (us))", "Idut by tgt");
}

// One measure [A]
function TOU_Measure(Current)
{
	dev.w(128, Current);
	dev.c(100);
	while (_TOU_Active())
		sleep(100);
	
	if (dev.r(197) == 1 || dev.r(197) == 2)
	{
		TOU_getVal();
		TOU_getError();
	}
	else
	{
		if (tou_printError)
		{
		print("OpResult fail");
		PrintStatus();	
		}		
	}
}

function TOU_Current(Current)
{
	dev.w(128, Current);
	dev.c(24);
	while (_TOU_Active())
		sleep(200);

	var idut = dev.r(250);
	var i = dev.r(128);
	var error = (100 * (idut - i) / i).toFixed(2);

	if (tou_print)
	{
		print("Idut	[A]:  " + idut);	
		print("Idut error [%]: " + error);
		print("------------------");
	}	
}

// Resourse measurements
function TOU_ResourceTest(Current, Num, Sleep)
{
	for (var i = 0; i < Num; i++)
	{
		print("#" + (i + 1));
		print("I set, A: " + Current);
		TOU_Measure(Current);
		sleep(Sleep);
	}
}

// Print values (Idut, Ton, Tgd)
function TOU_getVal()
{
	var idut = dev.r(250);
	var tgd = dev.r(251);
	var ton = dev.r(252);

	if (tou_print)
	{
		print("Idut	[A]:  " + idut);
		print("Tgd	[us]: " + (tgd / 1000));
		print("Ton	[us]: " + (ton / 1000));
		print("------------------");
	}
	return { tgd : tgd, ton : ton };
}

// Idut setpoint error, %
function TOU_getError()
{
	var i = dev.r(128);
	var iReal = dev.r(250);
	var error = (100 * (iReal - i) / i).toFixed(2);
	
	if (tou_printError)
	{
		print("Idut error [%]: " + error);
		print("------------------");
	}
	return error;
}
