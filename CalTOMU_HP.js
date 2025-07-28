include("TestTOU_HP.js")
include("Tektronix.js")
include("CalGeneral.js")


// Input parameters
ctomu_rise_time_ig = 1; 						// in us
ctomu_ig_array = [2000, 3000, 4000, 5000];	// in mA
ctomu_Rshunt_gate = 2; 	// Gate current shunt resistance, in Ohm
ctomu_dVdt_Approx = 0;

// Counters
ctomu_cntTotal = 0;
ctomu_cntDone = 0;

// Iterations
ctomu_Iterations = 1;

// Average
ctomu_UseAvg = 0;

// Measurement errors
EUosc = 3;
ERg = 1;

// Channels
ctomu_chMeasureI = 1;
ctomu_chSync = 3;

// Results storage
ctomu_ig_set = [];
ctomu_didt_set = [];
ctomu_trig_10_ig_set = [];

// Tektronix data
ctomu_ig_sc = [];
ctomu_didt_sc = [];
ctomu_trig_10_ig_sc = [];
ctomu_front_time_sc = [];

// Relative error
ctomu_ig_set_err = [];
ctomu_didt_set_err = [];
ctomu_trig_10_ig_set_err = [];
ctomu_front_time_set_err = [];

// Summary error
ctomu_ig_set_err_sum = [];
ctomu_front_time_set_err_sum = [];

// Correction
ctomu_ig_set_corr = [];
ctomu_didt_set_corr = [];
ctomu_trig_10_ig_set_corr = [];

function CTOMU_Init(portTOU, portTek, channelMeasureI, channelSync)
{
	// Init Tektronix
	TEK_PortInit(portTek);
	TEK_Send("RECAll:SETUp FACtory");

	if (channelMeasureI < 1 || channelMeasureI > 4 || 
		channelSync < 1 || channelSync > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	ctomu_chMeasureI = channelMeasureI;
	ctomu_chSync = channelSync;

	// Init TOU
	dev.Disconnect();
	dev.Connect(portTOU);

	// Init channels
	TEK_ChannelInit(ctomu_chMeasureI, "1", "0.8");
	TEK_ChannelInit(ctomu_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctomu_chSync, "2");
	// Horizontal settings
	TEK_Horizontal("2.5e-6", "15e-6");

	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctomu_chMeasureI || i == ctomu_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}

function CTOMU_CalibrateIg()
{
	// Collect data
	CTOMU_ResetA();
	CTOMU_ResetIgCal();

	if (CTOMU_IgCollect(ctomu_ig_array, ctomu_Iterations))
	{
		CTOMU_SaveIg("tou_ig_set_fixed");

		// Plot relative error distribution
		scattern(ctomu_ig_sc, ctomu_ig_set_err, "Ig (in A)", "Error (in %)", "Ig set relative error");
		
		// Plot summary error distribution
		scattern(ctomu_ig_sc, ctomu_ig_set_err_sum, "Ig (in A)", "Error (in %)", "Ig set summary error");
	
		// Calculate correction
		ctomu_ig_set_corr = CGEN_GetCorrection2("tou_ig_set_fixed");
		CTOMU_CalIgSet(ctomu_ig_set_corr[0], ctomu_ig_set_corr[1], ctomu_ig_set_corr[2]);
		CTOMU_PrintIgSetCal();
	}
}

function CTOMU_CalibrateRateIg()
{
	// Collect data
	CTOMU_ResetA();
	CTOMU_ResetRateIgCal();

	if (CTOMU_RateIgCollect(ctomu_ig_array, ctomu_Iterations))
	{
		CTOMU_SaveRateIg("tou_didt_set_fixed");

		// Plot relative error distribution
		scattern(ctomu_didt_sc, ctomu_didt_set_err, "dI/dt (in A/us)", "Error (in %)", "dI/dt set relative error");
	
		// Calculate correction
		ctomu_didt_set_corr = CGEN_GetCorrection2("tou_didt_set_fixed");
		CTOMU_CalRateIgSet(ctomu_didt_set_corr[0], ctomu_didt_set_corr[1], ctomu_didt_set_corr[2]);
		CTOMU_PrintRateIgSetCal();
	}	
}

function CTOMU_CalibrateTrig10Ig()
{
	// Collect data
	CTOMU_ResetA();
	CTOMU_ResetTrig10IgCal();

	if (CTOMU_Trig10IgCollect(ctomu_ig_array, ctomu_Iterations))
	{
		CTOMU_SaveTrig10Ig("tou_trig_10_set_fixed");

		// Plot relative error distribution
		scattern(ctomu_trig_10_ig_sc, ctomu_trig_10_ig_set_err, "Trigger 10 % Ig (in mA)", "Error (in %)", "Trigger 10 % Ig set relative error");
	
		// Calculate correction
		ctomu_trig_10_ig_set_corr = CGEN_GetCorrection2("tou_trig_10_set_fixed");
		CTOMU_CalTrig10IgSet(ctomu_trig_10_ig_set_corr[0], ctomu_trig_10_ig_set_corr[1], ctomu_trig_10_ig_set_corr[2]);
		CTOMU_PrintTrig10IgSetCal();
	}
}

function CTOMU_VerifyIg()
{
	// Collect data
	CTOMU_ResetA();

	if (CTOMU_IgCollect(ctomu_ig_array, ctomu_Iterations))
	{
		CTOMU_SaveIg("tou_ig_set_fixed");

		// Plot relative error distribution
		scattern(ctomu_ig_sc, ctomu_ig_set_err, "Ig (in A)", "Error (in %)", "Ig set relative error");
		
		// Plot summary error distribution
		scattern(ctomu_ig_sc, ctomu_ig_set_err_sum, "Ig (in A)", "Error (in %)", "Ig set summary error");
	}
}

function CTOMU_VerifyRateIg()
{
	// Collect data
	CTOMU_ResetA();

	if (CTOMU_RateIgCollect(ctomu_ig_array, ctomu_Iterations))
	{
		CTOMU_SaveRateIg("tou_didt_set_fixed");

		// Plot relative error distribution
		scattern(ctomu_didt_sc, ctomu_didt_set_err, "dI/dt (in A/us)", "Error (in %)", "dI/dt set relative error");
		scattern(ctomu_front_time_sc, ctomu_front_time_set_err, "Front time (in us)", "Error (in %)", "Front time relative error");
		
		// Plot summary error distribution
		scattern(ctomu_front_time_sc, ctomu_front_time_set_err_sum, "Front time (in us)", "Error (in %)", "Front time summary error");
	}
}

function CTOMU_VerifyTrig10Ig()
{
	// Collect data
	CTOMU_ResetA();

	if (CTOMU_Trig10IgCollect(ctomu_ig_array, ctomu_Iterations))
	{
		CTOMU_SaveTrig10Ig("tou_trig_10_set_fixed");

		// Plot relative error distribution
		scattern(ctomu_trig_10_ig_sc, ctomu_trig_10_ig_set_err, "Trigger 10 % Ig (in mA)", "Error (in %)", "Trigger 10 % Ig set relative error");
	}
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
	
	TEK_MeasMaxInit(ctomu_chMeasureI, 1);
	TEK_TriggerInit(ctomu_chSync, "2");
	TEK_Busy();

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctomu_cntDone++ + " of " + ctomu_cntTotal + " --");
			
			TEK_ScaleVertical(ctomu_chMeasureI, CurrentValues[j] * ctomu_Rshunt_gate / 1000, 80);
			sleep(1000);

			for (var k = 0; k < AvgNum; k++)
			{
				TOMUHP_GatePulse(CurrentValues[j] / ctomu_rise_time_ig, CurrentValues[j]);
				sleep(2000);
				if(anykey()) break;
			}
			
			// Set data
			var ig_set = CurrentValues[j];
			ctomu_ig_set.push(ig_set);
			print("Ig_Set, mA: " + ig_set);
			
			// Scope data
			var ig_sc = (TEK_Measure(1) * 1000 / ctomu_Rshunt_gate).toFixed(2);
			ctomu_ig_sc.push(ig_sc);
			print("Ig_Tek, mA: " + ig_sc);

			// Relative error
			var ig_set_err = ((ig_sc - ig_set) / ig_set * 100).toFixed(2);
			ctomu_ig_set_err.push(ig_set_err);
			print("Ig_Set_Err, %: " + ig_set_err);

			// Summary error
			var E0_ig = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ERg, 2));
			var ig_err_sum = (Math.sign_ma(ig_set_err) * (Math.abs(ig_set_err) + E0_ig)).toFixed(2);
			ctomu_ig_set_err_sum.push(ig_err_sum);
			print("Ig_Sum_Err, %: " + ig_err_sum);

			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOMU_RateIgCollect(CurrentValues, IterationsCount)
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
	
	TEK_Horizontal("2.5e-7", "7.5e-7");
	TEK_MeasPk2PkInit(ctomu_chMeasureI, 1);
	TEK_MeasRiseTimeInit(ctomu_chMeasureI, 2);
	TEK_TriggerInit(ctomu_chSync, "2");
	TEK_Busy();

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctomu_cntDone++ + " of " + ctomu_cntTotal + " --");
			
			TEK_ScaleVertical(ctomu_chMeasureI, CurrentValues[j] * ctomu_Rshunt_gate / 1000, 80);
			sleep(1000);

			for (var k = 0; k < AvgNum; k++)
			{
				TOMUHP_GatePulse(CurrentValues[j] / ctomu_rise_time_ig, CurrentValues[j]);
				sleep(2000);
				if(anykey()) break;
			}
			
			// Set data
			var dIdt_set = CurrentValues[j] / ctomu_rise_time_ig;
			ctomu_didt_set.push(dIdt_set);
			print("Ig_set, mA: " + CurrentValues[j]);
			print("dI/dt_Set, mA/us: " + dIdt_set);
			
			// Scope data
			var rise_time = TEK_Measure(2) * 1e6;
			var rise_current = TEK_Measure(1) * 0.8 * 1000 / ctomu_Rshunt_gate;

			if(ctomu_dVdt_Approx)
				var didt_sc = (TEK_CALC_dVdt(TEK_GetChannelData(ctomu_chMeasureI),10,90) * 1000 / ctomu_Rshunt_gate).toFixed(1)
			else
				var didt_sc = (rise_current / rise_time).toFixed(2);

			ctomu_didt_sc.push(didt_sc);
			print("dI/dt_Tek, mA/us: " + didt_sc);

			// Relative error
			var didt_set_err = ((didt_sc - dIdt_set) / dIdt_set * 100).toFixed(2);
			ctomu_didt_set_err.push(didt_set_err);
			print("dI/dt_Set_Err, %: " + didt_set_err);

			var front_time_sc = (rise_time * 1.25).toFixed(3);
			ctomu_front_time_sc.push(front_time_sc);
			print("Front time_Tek, us: " + front_time_sc);

			var front_time_set_err = ((front_time_sc - ctomu_rise_time_ig) / ctomu_rise_time_ig * 100).toFixed(2);
			ctomu_front_time_set_err.push(front_time_set_err);
			print("Front time_Err, %: " + front_time_set_err);

			// Summary error
			var E0_ig = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ERg, 2));
			var front_time_set_err_sum = (Math.sign_ma(front_time_set_err) * (Math.abs(front_time_set_err) + E0_ig)).toFixed(2);
			ctomu_front_time_set_err_sum.push(front_time_set_err_sum);
			print("Front time_Sum_Err, %: " + front_time_set_err_sum);

			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOMU_Trig10IgCollect(CurrentValues, IterationsCount)
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
	
	TEK_Horizontal("50e-9", "0");
	TEK_TriggerInit(ctomu_chSync, "2.5");
	TEK_CursorTimeInit(ctomu_chMeasureI);
	TEK_CursorTimeРosition(ctomu_chMeasureI, 0, 0);
	TEK_Busy();

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctomu_cntDone++ + " of " + ctomu_cntTotal + " --");
			
			TEK_ScaleVertical(ctomu_chMeasureI, CurrentValues[j] * ctomu_Rshunt_gate / 1000, 600);
			sleep(1000);

			for (var k = 0; k < AvgNum; k++)
			{
				TOMUHP_GatePulse(CurrentValues[j] / ctomu_rise_time_ig, CurrentValues[j]);
				sleep(2000);
				if(anykey()) break;
			}

			// Set data
			var trig_10_ig_set = CurrentValues[j] * 0.1;
			ctomu_trig_10_ig_set.push(trig_10_ig_set);
			print("Trig_10%_Ig, mA: " + trig_10_ig_set);
						
			// Scope data
			var trig_10_ig_sc = (TEK_MeasureCursor(1) * 1000 / ctomu_Rshunt_gate).toFixed(2);
			ctomu_trig_10_ig_sc.push(trig_10_ig_sc);
			print("Trig_10%_Ig_Tek, mA: " + trig_10_ig_sc);

			// Relative error
			var trig_10_ig_set_err = ((trig_10_ig_sc - trig_10_ig_set) / trig_10_ig_set * 100).toFixed(2);
			ctomu_trig_10_ig_set_err.push(trig_10_ig_set_err);
			print("Trig_10%_Ig_Set_Err, %: " + trig_10_ig_set_err);

			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOMU_ResetA()
{
	// Results storage
	ctomu_ig_set = [];
	ctomu_didt_set = [];
	ctomu_trig_10_ig_set = [];
	
	// Tektronix data
	ctomu_ig_sc = [];
	ctomu_didt_sc = [];
	ctomu_trig_10_ig_sc = [];
	ctomu_front_time_sc = [];
	
	// Relative error
	ctomu_ig_set_err = [];
	ctomu_didt_set_err = [];
	ctomu_trig_10_ig_set_err = [];
	ctomu_front_time_set_err = [];
	
	// Summary error
	ctomu_ig_set_err_sum = [];
	ctomu_front_time_set_err_sum = [];
	
	// Correction
	ctomu_ig_set_corr = [];
	ctomu_didt_set_corr = [];
	ctomu_trig_10_ig_set_corr = [];
}

function CTOMU_SaveIg(NameIgset)
{
	CGEN_SaveArrays(NameIgset, ctomu_ig_sc, ctomu_ig_set, ctomu_ig_set_err);
}

function CTOMU_SaveRateIg(NameRateIgset)
{
	CGEN_SaveArrays(NameRateIgset, ctomu_didt_sc, ctomu_didt_set, ctomu_didt_set_err);
}

function CTOMU_SaveTrig10Ig(NameTrig10Ig)
{
	CGEN_SaveArrays(NameTrig10Ig, ctomu_trig_10_ig_sc, ctomu_trig_10_ig_set, ctomu_trig_10_ig_set_err);
}

function CTOMU_PrintIgSetCal()
{
	print("Ig P2 x1e6   :" + dev.rs(17));
	print("Ig P1 x1000  :" + dev.rs(18));
	print("Ig P0        :" + dev.rs(19));
}

function CTOMU_PrintRateIgSetCal()
{
	print("dIg/dt P2 x1e6   :" + dev.rs(22));
	print("dIg/dt P1 x1000  :" + dev.rs(23));
	print("dIg/dt P0        :" + dev.rs(24));
}

function CTOMU_PrintTrig10IgSetCal()
{
	print("Trig10Ig P2 x1e6   :" + dev.rs(27));
	print("Trig10Ig P1 x1000  :" + dev.rs(28));
	print("Trig10Ig P0        :" + dev.rs(29));
}

function CTOMU_ResetIgCal()
{
	CTOMU_CalIgSet(0, 1, 0);
}

function CTOMU_ResetRateIgCal()
{
	CTOMU_CalRateIgSet(0, 1, 0);
}

function CTOMU_ResetTrig10IgCal()
{
	CTOMU_CalTrig10IgSet(0, 1, 0);
}

function CTOMU_CalIgSet(P2, P1, P0)
{
	dev.ws(17, Math.round(P2 * 1e6));
	dev.w(18, Math.round(P1 * 1000));
	dev.ws(19, Math.round(P0));	
}

function CTOMU_CalRateIgSet(P2, P1, P0)
{
	dev.ws(22, Math.round(P2 * 1e6));
	dev.w(23, Math.round(P1 * 1000));
	dev.ws(24, Math.round(P0));	
}

function CTOMU_CalTrig10IgSet(P2, P1, P0)
{
	dev.ws(27, Math.round(P2 * 1e6));
	dev.w(28, Math.round(P1 * 1000));
	dev.ws(29, Math.round(P0));	
}