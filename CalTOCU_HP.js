include("TestTOU_HP.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TEK_GetData.js")

ctocu_hp_vd_array = [600, 1000, 1500];
ctocu_hp_bit = 1;

// Counters
ctocu_hp_cntTotal = 0;
ctocu_hp_cntDone = 0;

// Iterations
ctocu_hp_Iterations = 1;

// Average
ctocu_hp_UseAvg = 0;

// Channels
cal_chMeasureVd = 1;

// Results storage
ctocu_hp_vd_set = [];

// Tektronix data
ctocu_hp_vd_sc = [];

// Relative error
ctocu_hp_vd_set_err = [];

// Correction
ctocu_hp_vd_corr = [];

function CAL_Init(portDevice, portTek, channelMeasureVd)
{
	if (channelMeasureVd < 1 || channelMeasureVd > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureVd = channelMeasureVd;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureVd)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}

function CTOCUHP_СalibrateVd()
{
	CTOCUHP_ResetA();
	CTOCUHP_ResetVdCal();

	// Tektronix init
	CTOCUHP_TekInit();

	if (CTOCUHP_CollectVd(ctocu_hp_vd_array, ctocu_hp_Iterations))
	{
		CTOCU_HP_SaveVd("tocu_hp_vd");

		// Plot relative error distribution
		scattern(ctocu_hp_vd_sc, ctocu_hp_vd_set_err, "Vd (in V)", "Error (in %)", "Vd set relative error");

		// Calculate correction
		ctocu_hp_vd_corr = CGEN_GetCorrection2("tocu_hp_vd");
		CTOCUHP_CalVD(ctocu_hp_vd_corr[0], ctocu_hp_vd_corr[1], ctocu_hp_vd_corr[2]);
		CTOCUHP_PrintVdCal();
	}
}

function CTOCUHP_VerifyVd()
{
	CTOCUHP_ResetA();

	// Tektronix init
	CTOCUHP_TekInit();

	if (CTOCUHP_CollectVd(ctocu_hp_vd_array, ctocu_hp_Iterations))
	{
		CTOCU_HP_SaveVd("tocu_hp_vd");

		// Plot relative error distribution
		scattern(ctocu_hp_vd_sc, ctocu_hp_vd_set_err, "Vd (in V)", "Error (in %)", "Vd set relative error");
	}
}

function CTOCUHP_CollectVd(VoltageValues, IterationsCount)
{
	ctocu_hp_cntTotal = IterationsCount * VoltageValues.length;
	ctocu_hp_cntDone = 1;

	var AvgNum;
	if (ctocu_hp_UseAvg)
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
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + ctocu_hp_cntDone++ + " of " + ctocu_hp_cntTotal + " --");
			
			CTOCUHP_TekScale(cal_chMeasureVd, VoltageValues[j]);

			for (var k = 0; k < AvgNum; k++)
			{
				TOCUHP_Pulse(1, VoltageValues[j], ctocu_hp_bit);
				sleep(1000);
			}
			
			// Set data
			var vd = VoltageValues[j];
			ctocu_hp_vd_set.push(vd);
			print("Vd_set, V: " + vd);

			// Scope data
			var vd_sc = Math.round(CTOCUHP_Measure(cal_chMeasureVd));
			ctocu_hp_vd_sc.push(vd_sc);
			print("Vd_tek, V: " + vd_sc);

			// Relative error
			var vd_set_err = ((vd_sc - vd) / vd * 100).toFixed(2);
			ctocu_hp_vd_set_err.push(vd_set_err);
			print("Vd_Set_Err, V: " + vd_set_err);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	dev.w(128, 600);
	dev.c(100);

	return 1;
}

function CTOCUHP_TekScale(Channel, Value)
{
	var scale = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + scale);

	TEK_TriggerInit(cal_chMeasureVd, Value / 2);
	sleep(500);
}

function CTOCUHP_TekInit()
{
	TEK_ChannelInit(cal_chMeasureVd, "100", "50");
	TEK_TriggerInit(cal_chMeasureVd, "300");
	TEK_Horizontal("2.5e-5", "0.1e-3");
	TEK_Send("measurement:meas" + cal_chMeasureVd + ":source ch" + cal_chMeasureVd);
	TEK_Send("measurement:meas" + cal_chMeasureVd + ":type maximum");
}

function CTOCUHP_Measure(Channel)
{
	sleep(1500);
	return TEK_Measure(Channel);
}

function CTOCUHP_ResetA()
{	
	// Results storage
	ctocu_hp_vd_set = [];

	// Tektronix data
	ctocu_hp_vd_sc = [];

	// Relative error
	ctocu_hp_vd_set_err = [];

	// Correction
	ctocu_hp_vd_corr = [];
}

function CTOCU_HP_SaveVd(NameVd)
{
	CGEN_SaveArrays(NameVd, ctocu_hp_vd_set, ctocu_hp_vd_sc, ctocu_hp_vd_set_err);
}

function CTOCUHP_ResetVdCal()
{
	CTOCUHP_CalVD(0, 1, 0);
}

function CTOCUHP_CalVD(P2, P1, P0)
{
	dev.ws(22, Math.round(P2 * 1e6));
	dev.w(23, Math.round(P1 * 1000));
	dev.ws(24, Math.round(P0));	
}

function CTOCUHP_PrintVdCal()
{
	print("Vd P2 x1e6		: " + dev.rs(22));
	print("Vd P1 x1000		: " + dev.rs(23));
	print("Vd P0			: " + dev.rs(24));
}