include("TestTOU_HP.js")
include("Tektronix.js")
include("CalGeneral.js")

// Input params
ctomu_Igmax = 20000;	// Maximum gate current [mA]
ctomu_IgRatemax = 100;	// Maximum gate current rate [A * 10 / us]
ctomu_Ri = 1;			// Current shunt resistance [Ohm]

// Calibrate Ig and comparator level
ctomu_Igmin = 1000;
ctomu_Igmax = ctomu_Igmax;
ctomu_Igstp = 2000;
ctomu_IgRate = 1000;

// Calibrate Ig rate
ctomu_IgRatemin = 1000;
ctomu_IgRatemax = 10000;
ctomu_IgRatestp = 1000;
ctomu_Ig = 20000;

// Counters
ctomu_cntTotal = 0;
ctomu_cntDone = 0;

// Iterations
ctomu_Iterations = 1;

// Channels
ctomu_chMeasureIg = 2;
ctomu_chSync = 1;

ctomu_ig_array = [];
ctomu_ig_rate_array = [];
ctomu_comp_lvl_array = [];

// Results storage
ctomu_ig = [];
ctomu_ig_rate = [];
ctomu_comp_lvl = [];

// Tektronix data
ctomu_ig_sc = [];
ctomu_ig_rate_sc = [];
ctomu_comp_lvl_sc = [];

// Relative error
ctomu_ig_err = [];
ctomu_ig_rate_err = [];
ctomu_comp_lvl_err = [];

// Correction
ctomu_ig_corr = [];
ctomu_ig_rate_corr = [];
ctomu_comp_lvl_corr = [];

ctomu_UseAvg = 1;

function CTOMU_Init(portTOMU, portTek, channelMeasureIg, channelSync)
{
	if (channelMeasureIg < 1 || channelMeasureIg > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	ctomu_chMeasureIg = channelMeasureIg;
	ctomu_chSync = channelSync;

	// Init TOMU
	dev.Disconnect();
	dev.Connect(portTOMU);

	// Init Tektronix
	TEK_PortInit(portTek);

	// Tektronix init
	CTOMU_IgScopeInit();
}

function CTOMU_CalibrateIg()
{
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOMU_ResetA();
	CTOMU_ResetIgCal();
	
	// Scope init
	CTOMU_IgScopeInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(ctomu_Igmin, ctomu_Igmax, ctomu_Igstp);

	if (CTOMU_IgCollect(CurrentArray, ctomu_Iterations))
	{
		CTOMU_SaveIg("tomuhp_ig");

		// Plot relative error distribution
		scattern(ctomu_ig, ctomu_ig_err, "Current (in mA)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		ctomu_ig_corr = CGEN_GetCorrection2("tomuhp_ig");
		CTOMU_CalIg(ctomu_ig_corr[0], ctomu_ig_corr[1], ctomu_ig_corr[2]);
		CTOMU_PrintIgCal();
	}
	
	CTOMU_CommutationControl(1);
}

function CTOMU_CalibrateIgRate()
{
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOMU_ResetA();
	CTOMU_ResetIgRateCal();
	
	// Scope init
	CTOMU_IgRateScopeInit();

	// Reload values
	var CurrentRateArray = CGEN_GetRange(ctomu_IgRatemin, ctomu_IgRatemax, ctomu_IgRatestp);

	if (CTOMU_IgRateCollect(CurrentRateArray, ctomu_Iterations))
	{		
		CTOMU_SaveIgRate("tomuhp_igrate");

		// Plot relative error distribution
		scattern(ctomu_ig_rate, ctomu_ig_rate_err, "Current rate (in mA / us)", "Error (in %)", "Current rate setpoint relative error");

		// Calculate correction
		ctomu_ig_rate_corr = CGEN_GetCorrection2("tomuhp_igrate");
		CTOMU_CalIgRate(ctomu_ig_rate_corr[0], ctomu_ig_rate_corr[1], ctomu_ig_rate_corr[2]);
		CTOMU_PrintIgRateCal();
	}
	
	CTOMU_CommutationControl(1);
}

function CTOMU_CalibrateComparatorLevel()
{
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOMU_ResetA();
	CTOMU_ResetComparatorLevelCal();
	
	// Scope init
	CTOMU_ComparatorLevelScopeInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(ctomu_Igmin, ctomu_Igmax, ctomu_Igstp);

	if (CTOMU_ComparatorLevelCollect(CurrentArray, ctomu_Iterations))
	{		
		CTOMU_SaveComparatorLevel("tomuhp_comp_level");

		// Plot relative error distribution
		scattern(ctomu_comp_lvl, ctomu_comp_lvl_err, "Comparator level (in mA)", "Error (in %)", "Comparator level relative error");

		// Calculate correction
		ctomu_comp_lvl_corr = CGEN_GetCorrection2("tomuhp_comp_level");
		CTOMU_CalComparatorLevel(ctomu_comp_lvl_corr[0], ctomu_comp_lvl_corr[1], ctomu_comp_lvl_corr[2]);
		CTOMU_PrintComparatorLevelCal();
	}
	
	CTOMU_CommutationControl(1);
}

function CTOMU_VerifyIg()
{
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOMU_ResetA();
	
	// Scope init
	CTOMU_IgScopeInit();

	// Collect data
	var CurrentArray = CGEN_GetRange(ctomu_Igmin, ctomu_Igmax, ctomu_Igstp);

	if (CTOMU_IgCollect(CurrentArray, ctomu_Iterations))
	{
		CTOMU_SaveIg("tomu_ig_fixed");

		// Plot relative error distribution
		scattern(ctomu_ig, ctomu_ig_err, "Current (in mA)", "Error (in %)", "Current setpoint relative error");
	}
	
	CTOMU_CommutationControl(1);
}

function CTOMU_VerifyIgRate()
{
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOMU_ResetA();
	
	// Scope init
	CTOMU_IgRateScopeInit();

	// Collect data
	var CurrentRateArray = CGEN_GetRange(ctomu_IgRatemin, ctomu_IgRatemax, ctomu_IgRatestp);

	if (CTOMU_IgRateCollect(CurrentRateArray, ctomu_Iterations))
	{
		CTOMU_SaveIg("tomu_igrate_fixed");

		// Plot relative error distribution
		scattern(ctomu_ig_rate, ctomu_ig_rate_err, "Current rate (in mA / us)", "Error (in %)", "Current setpoint relative error");
	}
	
	CTOMU_CommutationControl(1);
}

function CTOMU_VerifyComparatorLevel()
{
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOMU_ResetA();
	
	// Scope init
	CTOMU_ComparatorLevelScopeInit();

	// Collect data
	var CurrentArray = CGEN_GetRange(ctomu_Igmin, ctomu_Igmax, ctomu_Igstp);

	if (CTOMU_ComparatorLevelCollect(CurrentArray, ctomu_Iterations))
	{
		CTOMU_SaveComparatorLevel("tomu_ig_fixed");

		// Plot relative error distribution
		scattern(ctomu_comp_lvl, ctomu_comp_lvl_err, "Comparator level (in mA)", "Error (in %)", "Comparator level relative error");
	}
	
	CTOMU_CommutationControl(1);
}

function CTOMU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 30e-6");
	TEK_Send("cursor:vbars:position2 30e-6");
}

function CTOMU_IgRateTekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -5e-6");
	TEK_Send("cursor:vbars:position2 5e-6");
}

function CTOMU_ComparatorLevelTekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 0");
	TEK_Send("cursor:vbars:position2 30e-6");
}

function CTOMU_Ig(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);

	var f = TEK_Exec("cursor:vbars:hpos2?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return parseFloat(f).toFixed(4);
}

function CTOMU_IgRate(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	
	var U1 = TEK_Exec("cursor:vbars:hpos1?");
	var U2 = TEK_Exec("cursor:vbars:hpos2?");
	var dT = TEK_Exec("cursor:vbars:delta?");
	
	var IgRate = (U2 - U1) / ctomu_Ri / dT / 1000;

	return parseFloat(IgRate).toFixed(0);
}

function CTOMU_CompLvl(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);

	var f = TEK_Exec("cursor:vbars:hpos1?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return parseFloat(f).toFixed(4);
}

function CTOMU_IgCollect(CurrentValues, IterationsCount)
{
	ctomu_cntTotal = IterationsCount * CurrentValues.length;
	ctomu_cntDone = 1;

	var AvgNum;
	if (ctomu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctomu_cntDone++ + " of " + ctomu_cntTotal + " --");
			
			CTOMU_TekScale(ctomu_chMeasureIg, CurrentValues[j] * ctomu_Ri / 1000);
			TEK_TriggerInit(ctomu_chSync, 4);
			sleep(1000);

			//
			var tomu_print_copy = tou_print;
			tomu_print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				TOMUHP_GatePulse(ctomu_IgRate, CurrentValues[j]);
				sleep(500);
			}
			
			tou_print = tomu_print_copy;
			
			// Set data
			var ig = dev.r(130);
			ctomu_ig.push(ig);
			print("Ig, mA   :" + ig);

			// Scope data
			var ig_sc = (CTOMU_Ig(ctomu_chMeasureIg) / ctomu_Ri * 1000).toFixed(0);
			ctomu_ig_sc.push(ig_sc);
			print("Itek, mA :" + ig_sc);

			// Relative error
			ctomu_ig_err.push(((ig_sc - ig) / ig * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOMU_IgRateCollect(CurrentRateValues, IterationsCount)
{
	ctomu_cntTotal = IterationsCount * CurrentRateValues.length;
	ctomu_cntDone = 1;
	
	var AvgNum;
	if (ctomu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateValues.length; j++)
		{
			print("-- result " + ctomu_cntDone++ + " of " + ctomu_cntTotal + " --");
			
			CTOMU_HorizontalScale(ctomu_chMeasureIg, ctomu_Ig / CurrentRateValues[j], 0);
			sleep(1000);
			
			//
			var tomu_print_copy = tou_print;
			tomu_print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				TOMUHP_GatePulse(CurrentRateValues[j], ctomu_Ig);
				sleep(500);
			}
			
			tou_print = tomu_print_copy;
			
			// Set data
			var ig_rate = dev.r(131);
			ctomu_ig_rate.push(ig_rate);
			print("Ig rate, mA / us :" + ig_rate);

			// Scope data
			var ig_rate_sc = CTOMU_IgRate(ctomu_chMeasureIg);
			ctomu_ig_rate_sc.push(ig_rate_sc);
			print("Iscope, mA / us  :" + ig_rate_sc);

			// Relative error
			ctomu_ig_rate_err.push(((ig_rate_sc - ig_rate) / ig_rate * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOMU_ComparatorLevelCollect(CurrentValues, IterationsCount)
{
	ctomu_cntTotal = IterationsCount * CurrentValues.length;
	ctomu_cntDone = 1;

	var AvgNum;
	if (ctomu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctomu_cntDone++ + " of " + ctomu_cntTotal + " --");
			
			CTOMU_TekScale(ctomu_chMeasureIg, CurrentValues[j] * ctomu_Ri / 1000);
			TEK_TriggerInit(ctomu_chSync, 2);
			sleep(1500);

			//
			var tomu_print_copy = tou_print;
			tomu_print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				TOMUHP_GatePulse(ctomu_IgRate, CurrentValues[j]);
				sleep(500);
			}
			
			tou_print = tomu_print_copy;
			
			// Scope data
			var comp_lvl_sc = (CTOMU_CompLvl(ctomu_chMeasureIg) / ctomu_Ri * 1000).toFixed(0);
			ctomu_comp_lvl_sc.push(comp_lvl_sc);
			print("Copmarator level tek, mA :" + comp_lvl_sc);
			
			// Set data
			var comp_lvl = ((CTOMU_Ig(ctomu_chMeasureIg)  / ctomu_Ri * 1000) * 0.1).toFixed(0);
			ctomu_comp_lvl.push(comp_lvl);
			print("Comparator level, mA     :" + comp_lvl);

			// Relative error
			ctomu_comp_lvl_err.push(((comp_lvl_sc - comp_lvl) / comp_lvl * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOMU_IgRateScopeInit()
{
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctomu_chMeasureIg)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	// Init measurement
	CTOMU_Ig(ctomu_chMeasureIg, "4");
	// Init channels	
	TEK_ChannelInit(ctomu_chMeasureIg, "-4", "2");
	TEK_Horizontal("2.5e-6", "0");
	TEK_TriggerInit(ctomu_chMeasureIg, 8);
	// Init cursors
	CTOMU_IgRateTekCursor(ctomu_chMeasureIg);
}

function CTOMU_IgScopeInit()
{
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctomu_chMeasureIg || i == ctomu_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	// Init measurement
	CTOMU_Ig(ctomu_chMeasureIg, "4");
	// Init channels
	TEK_ChannelInit(ctomu_chMeasureIg, "1", "0.2");
	TEK_ChannelInit(ctomu_chSync, "1", "1");
	TEK_TriggerInit(ctomu_chSync, "4");
	TEK_Horizontal("5e-6", "20e-6");
	// Init cursors
	CTOMU_TekCursor(ctomu_chMeasureIg);
}

function CTOMU_ComparatorLevelScopeInit()
{
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctomu_chMeasureIg || i == ctomu_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	// Init measurement
	CTOMU_Ig(ctomu_chMeasureIg, "4");
	// Init channels	
	TEK_ChannelInit(ctomu_chMeasureIg, "-4", "2.5");
	TEK_Horizontal("5e-6", "15e-6");
	TEK_TriggerInit(ctomu_chMeasureIg, 2);
	// Init cursors
	CTOMU_ComparatorLevelTekCursor(ctomu_chMeasureIg);
}

function CTOMU_TekScale(Channel, Value)
{
	Value = Value / 7;
	
	TEK_Send("ch" + Channel + ":scale " + Value);
	//TEK_ChannelScale(Channel, Value);
}

function CTOMU_HorizontalScale(Channel, Value, Position)
{
	Value = Value / 6;
	
	if(Value >= 2.5)
		TEK_Horizontal('2.5e-6', Position);
	else if(Value >= 1.0)
		TEK_Horizontal('1e-6', Position);
	else if(Value >= 0.5)
		TEK_Horizontal('0.5e-6', Position);
	else if(Value >= 0.25)
		TEK_Horizontal('0.25e-6', Position);
}

function CTOMU_ResetA()
{
	// Results storage
	ctomu_ig = [];
	ctomu_ig_rate = [];
	ctomu_comp_lvl = [];

	// Tektronix data
	ctomu_ig_sc = [];
	ctomu_ig_rate_sc = [];
	ctomu_comp_lvl_sc = [];

	// Relative error
	ctomu_ig_err = [];
	ctomu_ig_rate_err = [];
	ctomu_comp_lvl_err = [];

	// Correction
	ctomu_ig_corr = [];
	ctomu_ig_rate_corr = [];
	ctomu_comp_lvl_corr = [];
}

function CTOMU_SaveIg(NameIg)
{
	CGEN_SaveArrays(NameIg, ctomu_ig_sc, ctomu_ig, ctomu_ig_err);
}

function CTOMU_SaveIgRate(NameIgRate)
{
	CGEN_SaveArrays(NameIgRate, ctomu_ig_rate_sc, ctomu_ig_rate, ctomu_ig_rate_err);
}

function CTOMU_SaveComparatorLevel(NameComparatorLevel)
{
	CGEN_SaveArrays(NameComparatorLevel, ctomu_comp_lvl_sc, ctomu_comp_lvl, ctomu_comp_lvl_err);
}

function CTOMU_PrintIgCal()
{
	print("Ig P2 x1e6:	" + dev.rs(17));
	print("Ig P1 x1000:	" + dev.r(18));
	print("Ig P0 :		" + dev.rs(19));
}

function CTOMU_PrintIgRateCal()
{
	print("IgRate P2 x1e6:	" + dev.rs(22));
	print("IgRate P1 x1000:	" + dev.r(23));
	print("IgRate P0 :		" + dev.rs(24));
}

function CTOMU_PrintComparatorLevelCal()
{
	print("Comparator level P2 x1e6:	" + dev.rs(27));
	print("Comparator level P1 x1000:	" + dev.r(28));
	print("Comparator level P0 :		" + dev.rs(29));
}

function CTOMU_ResetIgCal()
{
	CTOMU_CalIg(0, 1, 0);
}

function CTOMU_ResetIgRateCal()
{
	CTOMU_CalIgRate(0, 1, 0);
}

function CTOMU_ResetComparatorLevelCal()
{
	CTOMU_CalComparatorLevel(0, 1, 0);
}

function CTOMU_CalIg(P2, P1, P0)
{
	dev.ws(17, Math.round(P2 * 1e6));
	dev.w(18, Math.round(P1 * 1000));
	dev.ws(19, Math.round(P0));
}

function CTOMU_CalIgRate(P2, P1, P0)
{
	dev.ws(22, Math.round(P2 * 1e6));
	dev.w(23, Math.round(P1 * 1000));
	dev.ws(24, Math.round(P0));
}

function CTOMU_CalComparatorLevel(P2, P1, P0)
{
	dev.ws(27, Math.round(P2 * 1e6));
	dev.w(28, Math.round(P1 * 1000));
	dev.ws(29, Math.round(P0));
}

function CTOMU_CommutationControl(Control)
{
	if(Control)
		dev.w(14,0);
	else
		dev.w(14,1);
}
