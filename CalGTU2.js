include("TestGTU.js")
include("Tektronix.js")
include("CalGeneral.js")

// Version check
isOld = false;
function CGTU_VersionCheck()
{
	for (i = 0; i < 5; i++)
	{
		isOld = (dev.r(i) != 0 ? true : false);
	}
}

// Global definitions
cgtu_CompatibleMode = 1; // GTU with SL = 1; for other GTU = 0

cgtu_Res  = 10;  // in Ohms

cgtu_ResPower = 10;  // in Ohms
cgtu_CurrentValues = [];

// Igt Current range number
cgtu_RangeIgt = 1;    // 0 = Range [ < 50 mA]; 1 = Range [ > 50 mA] for measure & set
//
cgtu_UseAvg = 1;
cgtu_UseRangeTuning = 1;

// Current limits
cgtu_Imax = isOld ? 700 : 1000;
cgtu_Imin = 50;
cgtu_Istp = 50;

// Voltage limits
cgtu_Vmax = 12000;    // in mV
cgtu_Vmin = 2000;    // in mV

// Counters
cgtu_cntTotal = 0;
cgtu_cntDone = 0;
//
cgtu_UseAvg = 1;
cgtu_UseRangeTuning = 1;
cgtu_PlotSummaryError = 0;

// Results storage
cgtu_igt = [];
cgtu_vgt = [];
cgtu_ih = [];
cgtu_vd = [];
cgtu_id = [];
cgtu_vd_set = [];
cgtu_vgt_set = [];
cgtu_igt_set = [];
cgtu_id_set = [];

// Tektronix data
cgtu_igt_sc = [];
cgtu_vgt_sc = [];
cgtu_ih_sc = [];
cgtu_vd_sc = [];
cgtu_id_sc = [];

// Relative error
cgtu_igt_err = [];
cgtu_vgt_err = [];
cgtu_ih_err = [];
cgtu_vd_err = [];
cgtu_id_err = [];
cgtu_vgt_set_err = [];
cgtu_vd_set_err = [];
cgtu_igt_set_err = [];
cgtu_id_set_err = [];

// Summary error
cgtu_igt_err_sum = [];
cgtu_vgt_err_sum = [];
cgtu_ih_err_sum = [];
cgtu_vd_err_sum = [];
cgtu_id_err_sum = [];
cgtu_vgt_set_err_sum = [];
cgtu_vd_set_err_sum = [];
cgtu_igt_set_err_sum = [];
cgtu_id_set_err_sum = [];

// Correction
cgtu_igt_corr = [];
cgtu_vgt_corr = [];
cgtu_ih_corr = [];
cgtu_vd_corr = [];
cgtu_id_corr = [];
cgtu_vd_set_corr = [];
cgtu_vgt_set_corr = [];
cgtu_igt_set_corr = [];
cgtu_id_set_corr = [];

// Channels
cgtu_chMeasure = 1;
cgtu_chMeasureGate = 1;
cgtu_chMeasurePower = 1;
cgtu_chSync = 3;

// Iterations
cgtu_Iterations = 1;

// Measurement errors
EUosc = 3;
ER = isOld ? 1 : 0.5;
E0 = 0;

// General functions
function CGTU_Probe(ProbeCMD)
{
	var f
	// Acquire mode
	var AvgNum;
	if (cgtu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	sleep(500);

	for (var i = 0; i < (cgtu_UseAvg ? (AvgNum + 1) : 1); i++)
	{
		dev.c(ProbeCMD);
		while (dev.r(192) != 0) sleep(50);
		sleep(500);
	}
	
	sleep(1000);
	
	if (ProbeCMD == 110)
	{
		if (isOld)
		{
			f = CGTU_Measure((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower);
			var igt = dev.r(204);
			var vgt = dev.r(205);
			var igt_sc = (f / cgtu_ResGate).toFixed(1);
			var vgt_sc = f;

			// gtu data
			cgtu_igt.push(igt);
			cgtu_vgt.push(vgt);
			// tektronix data
			cgtu_igt_sc.push(igt_sc);
			cgtu_vgt_sc.push(vgt_sc);
			// relative error
			cgtu_igt_err.push(((igt - igt_sc) / igt_sc * 100).toFixed(2))
			cgtu_vgt_err.push(((vgt - vgt_sc) / vgt_sc * 100).toFixed(2))
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			cgtu_igt_err_sum.push(1.1 * Math.sqrt(Math.pow((igt - igt_sc) / igt_sc * 100, 2) + Math.pow(E0, 2)));
			cgtu_vgt_err_sum.push(1.1 * Math.sqrt(Math.pow((vgt - vgt_sc) / vgt_sc * 100, 2) + Math.pow(E0, 2)));
		}
		else
		{
			var vgt = (dev.r(204) + dev.r(233) / 1000).toFixed(2);
			var vgt_sc = f.toFixed(2);
			var vgt_set = dev.r(130 + (cgtu_CompatibleMode ? 3 : 0));
			f = CGTU_Measure(cgtu_chMeasure);

			// gtu data
			cgtu_vgt.push(vgt);
			cgtu_vgt_set.push(vgt_set);
			// tektronix data
			cgtu_vgt_sc.push(vgt_sc);
			// relative error
			cgtu_vgt_err.push(((vgt - vgt_sc) / vgt_sc * 100).toFixed(2));
			// Set error
			cgtu_vgt_set_err.push(((vgt_sc - vgt_set) / vgt_set * 100).toFixed(2));
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			cgtu_vgt_err_sum.push(1.1 * Math.sqrt(Math.pow((vgt - vgt_sc) / vgt_sc * 100, 2) + Math.pow(E0, 2)));
			cgtu_vgt_set_err_sum.push(1.1 * Math.sqrt(Math.pow((vgt_set - vgt_sc) / vgt_sc * 100, 2) + Math.pow(E0, 2)));
			
			print("Vset,    mV: " + vgt_set);
			print("Vgt,     mV: " + vgt);
			print("Tek,     mV: " + vgt_sc);
			print("Vset err, %: " + ((vgt_sc - vgt_set) / vgt_set * 100).toFixed(2));
			print("Vgt err,  %: " + ((vgt - vgt_sc) / vgt_sc * 100).toFixed(2));
		}
	}
	if (ProbeCMD != 110 && isOld)
	{
		var ih = dev.r(204);
		var ih_sc = (f / cgtu_ResPower).toFixed(1);
		
		cgtu_ih.push(ih);
		cgtu_ih_sc.push(ih_sc);
		cgtu_ih_err.push(((ih_sc - ih) / ih_sc * 100).toFixed(2));
		
		// Summary error
		E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
		cgtu_ih_err_sum.push(1.1 * Math.sqrt(Math.pow(((ih_sc - ih) / ih_sc).toFixed(2) * 100, 2) + Math.pow(E0, 2)));
	}
	
	if (!isOld)
	{
		if (ProbeCMD == 111)
		{	
			f = CGTU_Measure(cgtu_chMeasure);
			var igt = (dev.r(204) + dev.r(233) / 1000).toFixed(2);
			var igt_sc = (f / cgtu_Res).toFixed(2);
			var igt_set = dev.r(131 + (cgtu_CompatibleMode ? 3 : 0));
			
			// gtu data
			cgtu_igt.push(igt);
			cgtu_igt_set.push(igt_set);
			// tektronix data
			cgtu_igt_sc.push(igt_sc);
			// relative error
			cgtu_igt_err.push(((igt - igt_sc) / igt_sc * 100).toFixed(2));
			// Set error
			cgtu_igt_set_err.push(((igt_sc - igt_set) / igt_set * 100).toFixed(2));
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			cgtu_igt_err_sum.push(1.1 * Math.sqrt(Math.pow((igt - igt_sc) / igt_sc * 100, 2) + Math.pow(E0, 2)));
			cgtu_igt_set_err_sum.push(1.1 * Math.sqrt(Math.pow((igt_set - igt_sc) / igt_sc * 100, 2) + Math.pow(E0, 2)));
			
			print("Iset,    mA: " + igt_set);
			print("Igt,     mA: " + igt);
			print("Tek,     mA: " + igt_sc);
			print("Iset err, %: " + ((igt_sc - igt_set) / igt_set * 100).toFixed(2));
			print("Igt err,  %: " + ((igt - igt_sc) / igt_sc * 100).toFixed(2));
		}
		
		if (ProbeCMD == 112)
		{
			f = CGTU_Measure(cgtu_chMeasure);
			var vd = (dev.r(204) + dev.r(233) / 1000).toFixed(2);
			var vd_sc = f;
			var vd_set = dev.r(128 + (cgtu_CompatibleMode ? 3 : 0));
			
			// gtu data
			cgtu_vd.push(vd);
			// tektronix data
			cgtu_vd_sc.push(vd_sc);
			// relative error
			cgtu_vd_err.push(((vd - vd_sc) / vd_sc * 100).toFixed(2));
			// Set error
			cgtu_vd_set_err.push(((vd_sc - vd_set) / vd_set * 100).toFixed(2));
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			cgtu_vd_err_sum.push(1.1 * Math.sqrt(Math.pow((vd - vd_sc) / vd_sc * 100, 2) + Math.pow(E0, 2)));
			cgtu_vd_set_err_sum.push(1.1 * Math.sqrt(Math.pow((vd_set - vd_sc) / vd_sc * 100, 2) + Math.pow(E0, 2)));
			
			print("Vset,    mV: " + vd_set);
			print("Vd,      mV: " + vd);
			print("Tek,     mV: " + vd_sc);
			print("Vset err, %: " + ((vd_sc - vd_set) / vd_set * 100).toFixed(2));
			print("Vgt err,  %: " + ((vd - vd_sc) / vd_sc * 100).toFixed(2));
		}
		
		if (ProbeCMD == 113)
		{
			f = CGTU_Measure(cgtu_chMeasure);
			var id = (dev.r(204) + dev.r(233) / 1000).toFixed(2);
			var id_sc = (f / cgtu_Res).toFixed(2);
			var id_set = dev.r(129 + (cgtu_CompatibleMode ? 3 : 0));
			
			// gtu data
			cgtu_id.push(id);
			cgtu_id_set.push(id_set);
			// tektronix data
			cgtu_id_sc.push(id_sc);
			// relative error
			cgtu_id_err.push(((id - id_sc) / id_sc * 100).toFixed(2));
			// Set error
			cgtu_id_set_err.push(((id_sc - id_set) / id_set * 100).toFixed(2));
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			cgtu_id_err_sum.push(1.1 * Math.sqrt(Math.pow((id - id_sc) / id_sc * 100, 2) + Math.pow(E0, 2)));
			cgtu_id_set_err_sum.push(1.1 * Math.sqrt(Math.pow((id_set - id_sc) / id_sc * 100, 2) + Math.pow(E0, 2)));
			
			print("Iset,    mA: " + id_set);
			print("Id,      mA: " + id);
			print("Tek,     mA: " + id_sc);
			print("Iset err, %: " + ((id_sc - id_set) / id_set * 100).toFixed(2));
			print("Igt err,  %: " + ((id - id_sc) / id_sc * 100).toFixed(2));
		}
	}

	if (isOld)
	{
		print("Iset, mA: " + dev.r(140));
		if (ProbeCMD == 110)
		{
			print("Igt,  mA: " + dev.r(204));
			print("Vgt,  mV: " + dev.r(205));
		}
		else
			print("Ih,   mA: " + dev.r(204));
		print("Tek,  mV: " + f);
	}

	cgtu_cntDone++;
	print("-- result " + cgtu_cntDone + " of " + cgtu_cntTotal + " --");
	
	sleep(500);
}

function CGTU_TriggerTune()
{
	TEK_Send("trigger:main:pulse:width:polarity negative");
	TEK_Send("trigger:main:pulse:width:width" + (isOld ? "50e-3" : "5e-3"));
}

function CGTU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1" + (isOld ? "-60e-3" : "-6e-3"));
	TEK_Send("cursor:vbars:position2 0");
}

function CGTU_TekScale(Channel, Value)
{
	if (isOld)
	{
		TEK_ChannelScale(Channel, Value);
	}
	else
	{
		// 0.9 - use 90% of full range
		// 8 - number of scope grids in full scale
		var scale = (Value / (8 * 0.8));
		TEK_Send("ch" + Channel + ":scale " + scale);
	}
}

function CGTU_Measure(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	
	var f = TEK_Exec("cursor:vbars:hpos1?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f * 1000);
}

// Reset Arrays
function CGTU_ResetA()
{
	// Results storage
	cgtu_igt = [];
	cgtu_vgt = [];
	cgtu_ih = [];
	cgtu_vd = [];
	cgtu_id = [];
	cgtu_vd_set = [];
	cgtu_vgt_set = [];
	cgtu_igt_set = [];
	cgtu_id_set = [];

	// Tektronix data
	cgtu_igt_sc = [];
	cgtu_vgt_sc = [];
	cgtu_ih_sc = [];
	cgtu_vd_sc = [];
	cgtu_id_sc = [];

	// Relative error
	cgtu_igt_err = [];
	cgtu_vgt_err = [];
	cgtu_ih_err = [];
	cgtu_vd_err = [];
	cgtu_id_err = [];
	cgtu_vgt_set_err = [];
	cgtu_vd_set_err = [];
	cgtu_igt_set_err = [];
	cgtu_id_set_err = [];

	// Summary error
	cgtu_igt_err_sum = [];
	cgtu_vgt_err_sum = [];
	cgtu_ih_err_sum = [];
	cgtu_vd_err_sum = [];
	cgtu_id_err_sum = [];
	cgtu_vgt_set_err_sum = [];
	cgtu_vd_set_err_sum = [];
	cgtu_igt_set_err_sum = [];
	cgtu_id_set_err_sum = [];

	// Correction
	cgtu_igt_corr = [];
	cgtu_vgt_corr = [];
	cgtu_ih_corr = [];
	cgtu_vd_corr = [];
	cgtu_id_corr = [];
	cgtu_vd_set_corr = [];
	cgtu_vgt_set_corr = [];
	cgtu_igt_set_corr = [];
	cgtu_id_set_corr = [];
}
// General functions end

// CalGTU_4.0
if (!isOld)
{
function CGTU_Init(portGate, portTek, channelMeasure, channelSync)
{
	if (channelMeasure < 1 || channelMeasure > 4 ||
		channelSync < 1 || channelSync > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cgtu_chMeasure = channelMeasure;
	cgtu_chSync = channelSync;

	// Init GTU
	dev.Disconnect();
	dev.co(portGate);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(cgtu_chMeasure, "1", "1");
	TEK_ChannelInit(cgtu_chSync, "1", "1");
	// Init trigger
	TEK_TriggerPulseInit(cgtu_chSync, "2.5");
	CGTU_TriggerTune();
	// Horizontal settings
	TEK_Horizontal("1e-3", "-4e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cgtu_chMeasure || i == cgtu_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	CGTU_TekCursor(cgtu_chMeasure);
}

function CGTU_Collect(ProbeCMD, Resistance, cgtu_Values, IterationsCount)
{	
	cgtu_cntTotal = IterationsCount * cgtu_Values.length;
	cgtu_cntDone = 0;
	
	// Init trigger
	//TEK_TriggerPulseInit(((ProbeCMD == 110) || (ProbeCMD == 111)) ? cgtu_chMeasure : cgtu_chMeasure, "1");
	//CGTU_TriggerTune();
	
	// Configure scale
	switch (ProbeCMD)
	{
		case 110:
			CGTU_TekScale(cgtu_chMeasure, cgtu_Vmax / 1000);
			break;
			
		case 111:
			CGTU_TekScale(cgtu_chMeasure, cgtu_Imax * Resistance / 1000);
			break;
			
		case 112:
			CGTU_TekScale(cgtu_chMeasure, cgtu_Vmax / 1000);
			break;
			
		case 113:
			CGTU_TekScale(cgtu_chMeasure, cgtu_Imax * Resistance / 1000);
			break;
	}
	
	sleep(500);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cgtu_Values.length; j++)
		{
			if (cgtu_UseRangeTuning)
			{
				switch (ProbeCMD)
				{
					case 110:	// VG
						CGTU_TekScale(cgtu_chMeasure, cgtu_Values[j] / 1000);
						//TEK_TriggerLevelF(cgtu_Values[j] / (1000 * 2));
						sleep(2000);
						
						// Configure GTU
						dev.w(130 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Values[j]);
						CGTU_Probe(ProbeCMD);
						break;
						
					case 111:	// IG
						CGTU_TekScale(cgtu_chMeasure, cgtu_Values[j] * Resistance / 1000);
						//TEK_TriggerLevelF(cgtu_Values[j] * Resistance / (580 * 2));
						sleep(2000);
						
						// Configure GTU
						dev.w(131 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Values[j]);
						CGTU_Probe(ProbeCMD);
						break;
						
					case 112:	// VD
						CGTU_TekScale(cgtu_chMeasure, cgtu_Values[j] / 1000);
						//TEK_TriggerLevelF(cgtu_Values[j] / (1000 * 2));
						sleep(2000);
						
						// Configure GTU
						dev.w(128 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Values[j]);
						CGTU_Probe(ProbeCMD);
						break;
						
					case 113:	// ID
						CGTU_TekScale(cgtu_chMeasure, cgtu_Values[j] * Resistance / 1000);
						//TEK_TriggerLevelF(cgtu_Values[j] * Resistance / (600 * 2));
						sleep(2000);
						
						// Configure GTU
						dev.w(129 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Values[j]);
						CGTU_Probe(ProbeCMD);
						break;
				}
			}
			
			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CGTU_CalibrateIGate()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetIGateCal();
	
	if (CGTU_CollectIGate(cgtu_Iterations))
	{
		CGTU_SaveIGate("gtu_igt", "gtu_igt_set");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error");
		scattern(cgtu_igt_sc, cgtu_igt_set_err, "Igt (in mA)", "Error (in %)", "Igt set relative error");
		
		// Calculate correction
		cgtu_igt_corr = CGEN_GetCorrection2("gtu_igt");
		CGTU_CalIGT(cgtu_igt_corr[0], cgtu_igt_corr[1], cgtu_igt_corr[2]);
		
		cgtu_igt_set_corr = CGEN_GetCorrection2("gtu_igt_set");
		CGTU_CalIGT_SET(cgtu_igt_set_corr[0], cgtu_igt_set_corr[1], cgtu_igt_set_corr[2]);
		
		// Print correction
		CGTU_PrintIGateCal();
		CGTU_PrintIGateSetCal();
	}
}

function CGTU_VerifyIGate()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectIGate(cgtu_Iterations))
	{
		CGTU_SaveIGate("gtu_igt_fixed", "gtu_igt_set_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_igt_sc, cgtu_igt_set_err, "Igt set (in mA)", "Error (in %)", "Igt set relative error");
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_igt_sc, cgtu_igt_err_sum, "Igt (in mA)", "Error (in %)", "Igt summary error");sleep(200);
			scattern(cgtu_igt_sc, cgtu_igt_set_err_sum, "Igt set (in mA)", "Error (in %)", "Igt set summary error");
		}
	}
}

function CGTU_CalibrateIPower()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetIPowerCal();
	
	if (CGTU_CollectIPower(cgtu_Iterations))
	{
		CGTU_SaveIPower("gtu_id", "gtu_id_set");
		
		// Plot relative error distribution
		scattern(cgtu_id_sc, cgtu_id_err, "Id (in mA)", "Error (in %)", "Id relative error");
		scattern(cgtu_id_sc, cgtu_id_set_err, "Id set (in mA)", "Error (in %)", "Id set relative error");
		
		// Calculate correction
		cgtu_id_corr = CGEN_GetCorrection2("gtu_id");
		CGTU_CalID(cgtu_id_corr[0], cgtu_id_corr[1], cgtu_id_corr[2]);
		
		cgtu_id_set_corr = CGEN_GetCorrection2("gtu_id_set");
		CGTU_CalID_SET(cgtu_id_set_corr[0], cgtu_id_set_corr[1], cgtu_id_set_corr[2]);
		
		// Print correction
		CGTU_PrintIPowerCal();
		CGTU_PrintIPowerSetCal();
	}
}

function CGTU_VerifyIPower()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectIPower(cgtu_Iterations))
	{
		CGTU_SaveIPower("gtu_id_fixed", "gtu_id_set_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_id_sc, cgtu_id_err, "Id (in mA)", "Error (in %)", "Id relative error");
		scattern(cgtu_id_sc, cgtu_id_set_err, "Id set (in mA)", "Error (in %)", "Id set relative error");
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_id_sc, cgtu_id_err_sum, "Id (in mA)", "Error (in %)", "Id summary error");
			scattern(cgtu_id_sc, cgtu_id_set_err_sum, "Id set (in mA)", "Error (in %)", "Id set summary error");
		}
	}
}

function CGTU_CalibrateVGate()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetVGateCal();
	
	if (CGTU_CollectVGate(cgtu_Iterations))
	{
		CGTU_SaveVGate("gtu_vgt");
		
		// Plot relative error distribution
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error");
		scattern(cgtu_vgt_sc, cgtu_vgt_set_err, "Vgt (in mV)", "Error (in %)", "Vgt set relative error");
		
		// Calculate correction			
		cgtu_vgt_corr = CGEN_GetCorrection2("gtu_vgt");
		CGTU_CalVGT(cgtu_vgt_corr[0], cgtu_vgt_corr[1], cgtu_vgt_corr[2]);
		
		// Print correction
		CGTU_PrintVGateCal();
	}
}

function CGTU_VerifyVGate()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectVGate(cgtu_Iterations))
	{
		CGTU_SaveVGate("gtu_vgt_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_set_err, "Vgt (in mV)", "Error (in %)", "Vgt set relative error"); sleep(200);
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_vgt_sc, cgtu_vgt_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt summary error");sleep(200);
			scattern(cgtu_vgt_sc, cgtu_vgt_set_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt set summary error");
		}
	}
}

function CGTU_CalibrateVPower()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetVPowerCal();
	
	if (CGTU_CollectVPower(cgtu_Iterations))
	{
		CGTU_SaveVPower("gtu_vd");
		
		// Plot relative error distribution
		scattern(cgtu_vd_sc, cgtu_vd_err, "Vd (in mV)", "Error (in %)", "Vd relative error");
		scattern(cgtu_vd_sc, cgtu_vd_set_err, "Vd (in mV)", "Error (in %)", "Vd set relative error");
		
		// Calculate correction		
		cgtu_vd_corr = CGEN_GetCorrection2("gtu_vd");
		CGTU_CalVD(cgtu_vd_corr[0], cgtu_vd_corr[1], cgtu_vd_corr[2]);
		
		// Print correction
		CGTU_PrintVPowerCal();
	}
}

function CGTU_VerifyVPower()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectVPower(cgtu_Iterations))
	{
		CGTU_SaveVPower("gtu_vd_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_vd_sc, cgtu_vd_err, "Vd (in mV)", "Error (in %)", "Vd relative error");
		scattern(cgtu_vd_sc, cgtu_vd_set_err, "Vd (in mV)", "Error (in %)", "Vd set relative error");
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_vd_sc, cgtu_vd_err_sum, "Vd (in mV)", "Error (in %)", "Vd summary error");
			scattern(cgtu_vd_sc, cgtu_vd_set_err_sum, "Vd (in mV)", "Error (in %)", "Vd set summary error");
		}
	}
}

function CGTU_CollectVGate(IterationsCount)
{
	var cgtu_Vgstp = Math.round((cgtu_Vmax - cgtu_Vmin) / (cgtu_Points - 1));
	var cgtu_VoltageValues = CGEN_GetRange(cgtu_Vmin, cgtu_Vmax, cgtu_Vgstp);

	return CGTU_Collect(110, cgtu_Res, cgtu_VoltageValues, IterationsCount);
}

function CGTU_CollectIGate(IterationsCount)
{
	var cgtu_Istp = Math.round((cgtu_Imax - cgtu_Imin) / (cgtu_Points - 1));
	var cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Gate resistance set to " + cgtu_Res + " Ohms");
	print("-----------");
	return CGTU_Collect(111, cgtu_Res, cgtu_CurrentValues, IterationsCount);
}

function CGTU_CollectVPower(IterationsCount)
{
	var cgtu_Vdstp = Math.round((cgtu_Vmax - cgtu_Vmin) / (cgtu_Points - 1));
	var cgtu_VoltageValues = CGEN_GetRange(cgtu_Vmin, cgtu_Vmax, cgtu_Vdstp);

	return CGTU_Collect(112, cgtu_Res, cgtu_VoltageValues, IterationsCount);
}

function CGTU_CollectIPower(IterationsCount)
{
	var cgtu_Istp = Math.round((cgtu_Imax - cgtu_Imin) / (cgtu_Points - 1));
	var cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Power resistance set to " + cgtu_Res + " Ohms");
	print("-----------");
	return CGTU_Collect(113, cgtu_Res, cgtu_CurrentValues, IterationsCount);
}

function CGTU_SetLimits()
{
	// Set limits
	dev.w(128 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Vmax);
	dev.w(129 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Imax);
	dev.w(130 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Vmax);
	dev.w(131 + (cgtu_CompatibleMode ? 3 : 0) , cgtu_Imax);
}

// Save
function CGTU_SaveVGate(Name)
{
	CGEN_SaveArrays(Name, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err);
}

function CGTU_SaveIGate(NameIgt, NameIgt_Set)
{
	CGEN_SaveArrays(NameIgt, cgtu_igt, cgtu_igt_sc, cgtu_igt_err);
	CGEN_SaveArrays(NameIgt_Set, cgtu_igt_sc, cgtu_igt_set, cgtu_igt_set_err);
}

function CGTU_SaveVPower(Name)
{
	CGEN_SaveArrays(Name, cgtu_vd, cgtu_vd_sc, cgtu_vd_err);
}

function CGTU_SaveIPower(NameId, NameId_Set)
{
	CGEN_SaveArrays(NameId, cgtu_id, cgtu_id_sc, cgtu_id_err);
	CGEN_SaveArrays(NameId_Set, cgtu_id_sc, cgtu_id_set, cgtu_id_set_err);
}

// Cal
function CGTU_CalIGT_SET(P2, P1, P0)
{
	switch (cgtu_RangeIgt)
	{
		case 0:
			dev.ws(105, Math.round(P2 * 1e6));
			dev.w(106, Math.round(P1 * 1000));
			dev.ws(107, Math.round(P0));
			break;
		case 1:
			dev.ws(47, Math.round(P2 * 1e6));
			dev.w(48, Math.round(P1 * 1000));
			dev.ws(49, Math.round(P0));
			break;
		default:
			print("Incorrect Igt set range.");
			break;
	}
}

function CGTU_CalVD(P2, P1, P0)
{
	dev.ws(18, Math.round(P2 * 1e6));
	dev.w(19, Math.round(P1 * 1000));
	dev.ws(20, Math.round(P0));
}

function CGTU_CalID(P2, P1, P0)
{
	dev.ws(23, Math.round(P2 * 1e6));
	dev.w(24, Math.round(P1 * 1000));
	dev.ws(25, Math.round(P0));
}

function CGTU_CalID_SET(P2, P1, P0)
{
	dev.ws(40, Math.round(P2 * 1e6));
	dev.w(41, Math.round(P1 * 1000));
	dev.ws(42, Math.round(P0));
}

// Print
function CGTU_PrintVGateCal()
{
	print("VGT P2 x1e6:	" + dev.rs(28));
	print("VGT P1 x1000:	" + dev.r(29));
	print("VGT P0:		" + dev.rs(30));
}

function CGTU_PrintIGateCal()
{
	switch (cgtu_RangeIgt)
	{
		case 0:
			print("IGT0 P2 x1e6:	" + dev.rs(115));
			print("IGT0 P1 x1000:	" + dev.r(116));
			print("IGT0 P0:		" + dev.rs(117));
			break;
		case 1:
			print("IGT1 P2 x1e6:	" + dev.rs(33));
			print("IGT1 P1 x1000:	" + dev.r(34));
			print("IGT1 P0:		" + dev.rs(35));
			break;
		default:
			print("Incorrect Igt range.");
			break;
	}
}

function CGTU_PrintIGateSetCal()
{
	switch (cgtu_RangeIgt)
	{
		case 0:
			print("IGT0 set P2 x1e6:	" + dev.rs(105));
			print("IGT0 set P1 x1000:	" + dev.r(106));
			print("IGT0 set P0:		" + dev.rs(107));
			break;
		case 1:
			print("IGT1 set P2 x1e6:	" + dev.rs(47));
			print("IGT1 set P1 x1000:	" + dev.r(48));
			print("IGT1 set P0:		" + dev.rs(49));
			break;
		default:
			print("Incorrect Igt range.");
			break;
	}
}

function CGTU_PrintVPowerCal()
{
	print("VD P2 x1e6:	" + dev.rs(18));
	print("VD P1 x1000:	" + dev.r(19));
	print("VD P0:		" + dev.rs(20));
}

function CGTU_PrintIPowerCal()
{
	print("ID P2 x1e6:	" + dev.rs(23));
	print("ID P1 x1000:	" + dev.r(24));
	print("ID P0:		" + dev.rs(25));
}

function CGTU_PrintIPowerSetCal()
{
	print("ID set  P2 x1e6:	" + dev.rs(40));
	print("ID set  P1 x1000:	" + dev.r(41));
	print("ID set  P0:		" + dev.rs(42));
}

// Reset
function CGTU_ResetVGateCal()
{
	CGTU_CalVGT(0, 1, 0);
}

function CGTU_ResetIGateCal()
{
	CGTU_CalIGT(0, 1, 0);
	CGTU_CalIGT_SET(0, 1, 0);
}

function CGTU_ResetVPowerCal()
{
	CGTU_CalVD(0, 1, 0);
}

function CGTU_ResetIPowerCal()
{
	CGTU_CalID(0, 1, 0);
	CGTU_CalID_SET(0, 1, 0);
}

// HMIU calibration
function Measuring_Filter()
{
	allowedMeasuring = "TPS2000";
	return allowedMeasuring;
}

function CGTU_Initialize()
{
	channelMeasure = 1;
	channelSync = 3;
	TEK_ChannelInit(cgtu_chMeasure, "1", "1");
	TEK_ChannelInit(cgtu_chSync, "1", "1");
	TEK_TriggerPulseInit(cgtu_chSync, "2.5");
	CGTU_TriggerTune();
	TEK_Horizontal("1e-3", "-4e-3");
	for (var i = 1; i <= 4; i++) {
		if (i == cgtu_chMeasure || i == cgtu_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	CGTU_TekCursor(cgtu_chMeasure);
}

function CGTU_VerifyIgt(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_RangeIgt = rangeId;
	cgtu_Imin = rangeMin;
	cgtu_Imax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_Res = resistance;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_VerifyIGate();
	return [cgtu_igt_set, cgtu_igt, cgtu_igt_sc, cgtu_igt_set_err];
}

function CGTU_VerifyVgt(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_Vmin = rangeMin;
	cgtu_Vmax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_VerifyVGate();
	return [cgtu_vgt_set, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err];
}

function CGTU_VerifyIh(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_Imin = rangeMin;
	cgtu_Imax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_Res = resistance;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_VerifyIPower();
	return [cgtu_id_set, cgtu_id, cgtu_id_sc, cgtu_id_set_err];
}

function CGTU_CalVGT(P2, P1, P0)
{
	dev.ws(28, Math.round(P2 * 1e6));
	dev.w(29, Math.round(P1 * 1000));
	dev.ws(30, Math.round(P0));
}

function CGTU_CalIGT(P2, P1, P0)
{
	switch (cgtu_RangeIgt)
	{
		case 0:
			dev.ws(115, Math.round(P2 * 1e6));
			dev.w(116, Math.round(P1 * 1000));
			dev.ws(117, Math.round(P0));
			break;
		case 1:
			dev.ws(33, Math.round(P2 * 1e6));
			dev.w(34, Math.round(P1 * 1000));
			dev.ws(35, Math.round(P0));
			break;
		default:
			print("Incorrect Igt range.");
			break;
	}
}
}
// end CalGTU_4.0

// =================================

// CalGTU_Old
if (isOld)
{
function CGTU_Init(portGate, portTek, channelMeasureGate, channelMeasurePower)
{
	if (channelMeasureGate < 1 || channelMeasureGate > 4 ||
		channelMeasurePower < 1 || channelMeasurePower > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cgtu_chMeasureGate = channelMeasureGate;
	cgtu_chMeasurePower = channelMeasurePower;
	
	// Init GTU
	dev.Disconnect();
	dev.Connect(portGate);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(cgtu_chMeasureGate, "1", "1");
	TEK_ChannelInit(cgtu_chMeasurePower, "1", "1");
	// Init trigger
	TEK_TriggerPulseInit(cgtu_chMeasureGate, "1");
	CGTU_TriggerTune();
	// Horizontal settings
	TEK_Horizontal("10e-3", "-40e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cgtu_chMeasureGate || i == cgtu_chMeasurePower)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	CGTU_TekCursor(cgtu_chMeasureGate);
	CGTU_TekCursor(cgtu_chMeasurePower);
}

function CGTU_Collect(ProbeCMD, Resistance, cgtu_CurrentValues, IterationsCount)
{	
	cgtu_cntTotal = IterationsCount * cgtu_CurrentValues.length;
	cgtu_cntDone = 0;
	
	// Init trigger
	TEK_TriggerPulseInit((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, "1");
	CGTU_TriggerTune();
	
	// Configure scale
	CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, cgtu_Imax * Resistance / 1000);
	sleep(500);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cgtu_CurrentValues.length; j++)
		{
			if (cgtu_UseRangeTuning)
				CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, cgtu_CurrentValues[j] * Resistance / 1000);
			
			// Configure trigger
			TEK_TriggerLevelF(cgtu_CurrentValues[j] * Resistance / (1000 * 2));
			sleep(1000);
			
			// Configure GTU
			dev.w(140, cgtu_CurrentValues[j]);
			CGTU_Probe(ProbeCMD);
			
			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CGTU_CalibrateGate()
{
	// Collect data
	CGTU_ResetA();
	CGTU_ResetGateCal();
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		CGTU_SaveGate("gtu_igt", "gtu_vgt");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cgtu_igt_corr = CGEN_GetCorrection2("gtu_igt");
			CGTU_CalIGT2(cgtu_igt_corr[0], cgtu_igt_corr[1], cgtu_igt_corr[2]);
			
			cgtu_vgt_corr = CGEN_GetCorrection2("gtu_vgt");
			CGTU_CalVGT2(cgtu_vgt_corr[0], cgtu_vgt_corr[1], cgtu_vgt_corr[2]);
		}
		else
		{
			// Calculate correction
			cgtu_igt_corr = CGEN_GetCorrection("gtu_igt");
			CGTU_CalIGT(cgtu_igt_corr[0], cgtu_igt_corr[1]);
			
			cgtu_vgt_corr = CGEN_GetCorrection("gtu_vgt");
			CGTU_CalVGT(cgtu_vgt_corr[0], cgtu_vgt_corr[1]);
		}
		
		// Print correction
		CGTU_PrintGateCal();
	}
}

function CGTU_LineResistanceCalc()
{
	var cgtu_dv_sum = 0;
	var cgtu_igt_sum = 0;
	var cgtu_rline = 0;
	
	dev.w(95,0);
	
	// Collect data
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		for (i=0; i<cgtu_vgt.length; i++)
		{
			cgtu_dv_sum += cgtu_vgt[i] - cgtu_vgt_sc[i];
			cgtu_igt_sum += Math.round(cgtu_igt_sc[i]);
		}
		
		cgtu_rline = Math.round(cgtu_dv_sum / cgtu_igt_sum * 1000);
		
		print("Line resistance = " + cgtu_rline + "mOhm")
		
		dev.w(95,cgtu_rline);
		dev.c(200);
	}
}

function CGTU_CalibratePower()
{
	// Collect data
	CGTU_ResetA();
	CGTU_ResetPowerCal();
	if (CGTU_CollectPower(cgtu_Iterations))
	{
		CGTU_SavePower("gtu_ih");
		
		// Plot relative error distribution
		scattern(cgtu_ih_sc, cgtu_ih_err, "Ih (in mA)", "Error (in %)", "Ih relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cgtu_ih_corr = CGEN_GetCorrection2("gtu_ih");
			CGTU_CalIH2(cgtu_ih_corr[0], cgtu_ih_corr[1], cgtu_ih_corr[2]);
		}
		else
		{
			// Calculate correction
			cgtu_ih_corr = CGEN_GetCorrection("gtu_ih");
			CGTU_CalIH(cgtu_ih_corr[0], cgtu_ih_corr[1]);
		}
		
		// Print correction
		CGTU_PrintPowerCal();
	}
}

function CGTU_VerifyGate()
{
	// Collect corrected data
	CGTU_ResetA();
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		CGTU_SaveGate("gtu_igt_fixed", "gtu_vgt_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error"); sleep(200);
		
		// Plot summary error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err_sum, "Igt (in mA)", "Error (in %)", "Igt summary error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt summary error");
	}
}

function CGTU_VerifyPower()
{
	// Collect corrected data
	CGTU_ResetA();
	if (CGTU_CollectPower(cgtu_Iterations))
	{
		CGTU_SavePower("gtu_ih_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_ih_sc, cgtu_ih_err, "Ih (in mA)", "Error (in %)", "Ih relative error");
		scattern(cgtu_ih_sc, cgtu_ih_err_sum, "Ih (in mA)", "Error (in %)", "Ih summary error");
	}
}

function CGTU_CollectGate(IterationsCount)
{
	cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Gate resistance set to " + cgtu_ResGate + " Ohms");
	print("-----------");
	return CGTU_Collect(110, cgtu_ResGate, cgtu_CurrentValues, IterationsCount);
}

function CGTU_CollectPower(IterationsCount)
{
	cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Power resistance set to " + cgtu_ResPower + " Ohms");
	print("-----------");
	return CGTU_Collect(111, cgtu_ResPower, cgtu_CurrentValues, IterationsCount);
}

function CGTU_SaveGate(NameIGT, NameVGT)
{
	CGEN_SaveArrays(NameIGT, cgtu_igt, cgtu_igt_sc, cgtu_igt_err, cgtu_igt_err_sum);	
	CGEN_SaveArrays(NameVGT, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err, cgtu_vgt_err_sum);
}

function CGTU_SavePower(NameIH)
{
	CGEN_SaveArrays(NameIH, cgtu_ih, cgtu_ih_sc, cgtu_ih_err, cgtu_ih_err_sum);
}

function CGTU_CalIGT2(P2, P1, P0)
{
	dev.ws(50, Math.round(P2 * 1e6));
	dev.w(51, Math.round(P1 * 1000));
	dev.ws(57, Math.round(P0));
}

function CGTU_CalVGT2(P2, P1, P0)
{
	dev.ws(52, Math.round(P2 * 1e6));
	dev.w(53, Math.round(P1 * 1000));
	dev.ws(56, Math.round(P0));
}

function CGTU_CalIH(K, Offset)
{
	dev.w(33, Math.round(K * 1000));
	dev.w(34, 1000);
	dev.ws(35, Math.round(Offset));
}

function CGTU_CalIH2(P2, P1, P0)
{
	dev.ws(33, Math.round(P2 * 1e6));
	dev.w(34, Math.round(P1 * 1000));
	dev.ws(35, Math.round(P0));
}

function CGTU_PrintGateCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("IGT P2 x1e6:	" + dev.rs(50));
		print("IGT P1 x1000:	" + dev.r(51));
		print("IGT P0:		" + dev.rs(57));
		
		print("VGT P2 x1e6:	" + dev.rs(52));
		print("VGT P1 x1000:	" + dev.r(53));
		print("VGT P0:		" + dev.rs(56));
	}
	else
	{
		print("IGT K:		" + (dev.r(50) / dev.r(51)));
		print("IGT Offset:	" + dev.rs(57));
		print("VGT K:		" + (dev.r(52) / dev.r(53)));
		print("VGT Offset:	" + dev.rs(56));
	}
}

function CGTU_PrintPowerCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("IH  P2 x1e6:	" + dev.rs(33));
		print("IH  P1 x1000:	" + dev.r(34));
		print("IH  P0:		" + dev.rs(35));
	}
	else
	{
		print("IH  K:		" + (dev.r(33) / dev.r(34)));
		print("IH  Offset:	" + dev.rs(35));
	}
}

function CGTU_ResetGateCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		CGTU_CalIGT2(0, 1, 0);
		CGTU_CalVGT2(0, 1, 0);
	}
	else
	{
		CGTU_CalIGT(1, 0);
		CGTU_CalVGT(1, 0);
	}
	
	dev.w(95, 0);
}

function CGTU_ResetPowerCal()
{
	if (CGEN_UseQuadraticCorrection())
		CGTU_CalIH2(0, 1, 0);
	else
		CGTU_CalIH(1, 0);
}

function CGTU_CalIGT(K, Offset)
{
	dev.w(50, Math.round(K * 1000));
	dev.w(51, 1000);
	dev.ws(57, Math.round(Offset));
}

function CGTU_CalVGT(K, Offset)
{
	dev.w(52, Math.round(K * 1000));
	dev.w(53, 1000);
	dev.ws(56, Math.round(Offset));
}
}
