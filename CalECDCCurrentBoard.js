include("TestECDCCurrentBoard.js")
include("Tektronix.js")
include("CalGeneral.js")

// Input params
cal_VoltageRange   = 0;		// 0 - 10mV, 1 - 30mV, 2 - 250mV, 3 - 1.5V, 4 - 11V
cal_CurrentRange   = 0;		// 0 - 20mA, 1 - 200mA, 2 - 2A, 3 - 20A, 4 - 250A

cal_LoadResistance = 1;		// Load resistance in Ohm

// Hardware definitions
cal_CurrentRangeArrayMin = [1000, 20010, 200010, 2000010, 20000010];				// Min current values for ranges
cal_CurrentRangeArrayMax = [20000, 200000, 2000000, 20000000, 250000000];			// Max current values for ranges
cal_VoltageRangeArrayMin = [1000, 10010, 30010, 250010, 1500010];					// Min voltage values for ranges
cal_VoltageRangeArrayMax = [10000, 30000, 250000, 1500000, 10000000];				// Max voltage values for ranges

// Counters
cal_cntTotal = 0;
cal_cntDone = 0;

cal_dev = 1;

// Iterations
cal_Iterations = 3;

// Channels
cal_chMeasureId = 1;
cal_chMeasureUd = 2;
cal_chTrigg = 3;

// Arrays
cal_id_array = [];
cal_ud_array = [];

// Results storage
cal_id = [];
cal_ud = [];

// Tektronix data
cal_id_sc = [];
cal_ud_sc = [];

// Relative error
cal_id_err = [];
cal_ud_err = [];

// Correction
cal_id_corr = [];
cal_ud_corr = [];

cal_UseAvg = 1;

function CAL_Init(portDevice, portTek, channelMeasureId, channelMeasureUd, channelTrigg)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureUd = channelMeasureUd;
	cal_chMeasureId = channelMeasureId;
	cal_chTrigg = channelTrigg;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
}

function CAL_TekInit(Channel)
{
	// Init channels
	TEK_ChannelInit(Channel, "1", "1");
	TEK_ChannelScale(Channel, "1");
	// Init trigger
	TEK_TriggerInit(cal_chTrigg, "2");
	TEK_Send("trigger:main:edge:slope fall");
	// Horizontal settings
	TEK_Horizontal("100e-6", "5.5e-3");
}

function CAL_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type mean");
}	

function CAL_TekScale(Channel, Value)
{
	Value = Value / 4;
	TEK_Send("ch" + Channel + ":scale " + Value);
}

function CAL_Measure(Channel, Resolution)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2.7e+8)
		f = 0;
	return parseFloat(f).toFixed(Resolution);
}

function CAL_CalibrateId()
{	
	// Collect data
	var IdMin = cal_CurrentRangeArrayMin[cal_CurrentRange];
	var IdMax = cal_CurrentRangeArrayMax[cal_CurrentRange];
	var IdStp = ((IdMax - IdMin) / 10) + 1;
	
	CAL_ResetA();
	CAL_ResetIdCal();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureId);

	// Reload values
	var CurrentArray = CGEN_GetRange(IdMin, IdMax, IdStp);

	if (CAL_IdCollect(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("ECDCCurrentBoard_id");

		// Plot relative error distribution
		scattern(cal_id_sc, cal_id_err, "Current (in uA)", "Error (in %)", "Current relative error");

		// Calculate correction
		cal_id_corr = CGEN_GetCorrection2("ECDCCurrentBoard_id");
		CAL_SetCoefId(cal_id_corr[0], cal_id_corr[1], cal_id_corr[2]);
		CAL_PrintCoefId();
	}
}

function CAL_CalibrateUd()
{	
	// Collect data
	var UdMin = cal_VoltageRangeArrayMin[cal_VoltageRange];
	var UdMax = cal_VoltageRangeArrayMax[cal_VoltageRange];
	var UdStp = ((UdMax - UdMin) / 10) + 1;	
	
	CAL_ResetA();
	CAL_ResetUdCal();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureUd);

	// Reload values
	var VoltageArray = CGEN_GetRange(UdMin, UdMax, UdStp);

	if (CAL_UdCollect(VoltageArray, cal_Iterations))
	{
		CAL_SaveUd("ECDCCurrentBoard_ud");

		// Plot relative error distribution
		scattern(cal_ud_sc, cal_ud_err, "Voltage (in uV)", "Error (in %)", "Voltage relative error");

		// Calculate correction
		cal_ud_corr = CGEN_GetCorrection2("ECDCCurrentBoard_ud");
		CAL_SetCoefUd(cal_ud_corr[0], cal_ud_corr[1], cal_ud_corr[2]);
		CAL_PrintCoefUd();
	}
}

function CAL_VerifyId()
{	
	// Collect data
	var IdMin = cal_CurrentRangeArrayMin[cal_CurrentRange];
	var IdMax = cal_CurrentRangeArrayMax[cal_CurrentRange];
	var IdStp = ((IdMax - IdMin) / 10) + 1;
	
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureId);

	// Reload values
	var CurrentArray = CGEN_GetRange(IdMin, IdMax, IdStp);

	if (CAL_IdCollect(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("ECDCCurrentBoard_id_fixed");

		// Plot relative error distribution
		scattern(cal_id_sc, cal_id_err, "Current (in uA)", "Error (in %)", "Current relative error");
	}
}

function CAL_VerifyUd()
{	
	// Collect data
	var UdMin = cal_VoltageRangeArrayMin[cal_VoltageRange];
	var UdMax = cal_VoltageRangeArrayMax[cal_VoltageRange];
	var UdStp = ((UdMax - UdMin) / 10) + 1;		

	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureUd);

	// Reload values
	var VoltageArray = CGEN_GetRange(UdMin, UdMax, UdStp);

	if (CAL_UdCollect(VoltageArray, cal_Iterations))
	{
		CAL_SaveUd("ECDCCurrentBoard_ud_fixed");

		// Plot relative error distribution
		scattern(cal_ud_sc, cal_ud_err, "Voltage (in uV)", "Error (in %)", "Voltage relative error");
	}
}

function CAL_IdCollect(CurrentValues, IterationsCount)
{
	cal_cntTotal = IterationsCount * CurrentValues.length;
	cal_cntDone = 1;
	var Dev = 1;
	
	if( cal_CurrentRange >= 2)
	{
		Dev = 1000;
	}
	else
	{
		Dev = 1;
	}

	var AvgNum;
	if (cal_UseAvg)
	{
		AvgNum = 3;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	TEK_TriggerInit(cal_chTrigg, "2");
	TEK_Send("trigger:main:edge:slope fall");
	CAL_TekMeasurement(cal_chMeasureId);
	
	sleep(1000);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + cal_cntDone++ + " of " + cal_cntTotal + " --");
			
			print("IdTarget, uA: " + CurrentValues[j]);
			
			CAL_TekScale(cal_chMeasureId, (CurrentValues[j] * cal_LoadResistance / 1000000));
			sleep(1500);

			//
			var cal_print_copy = ECDC_CB_Print;
			ECDC_CB_Print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				ECDC_CB_Measure(CurrentValues[j], 11000000);
				sleep(3000);
			}
			
			ECDC_CB_Print = cal_print_copy;
			
			// Unit data
			var id_read = (r32(250) / Dev).toFixed(2);
			cal_id.push(id_read);
			print("Idread, uA: " + id_read);

			// Scope data
			var id_sc = (CAL_Measure(cal_chMeasureId, "3") / cal_LoadResistance * 1000).toFixed(2);
			cal_id_sc.push(id_sc);
			print("Idtek, uA: " + id_sc);

			// Relative error
			var id_err = ((id_read - id_sc) / id_sc * 100).toFixed(2);
			cal_id_err.push(id_err);
			print("Iderr, %: " + id_err);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_UdCollect(VoltageValues, IterationsCount)
{
	cal_cntTotal = IterationsCount * VoltageValues.length;
	cal_cntDone = 1;
	var Dev = 1;
	
	if( cal_VoltageRange >= 3)
	{
		Dev = 1000;
	}
	else
	{
		Dev = 1;
	}

	var AvgNum;
	if (cal_UseAvg)
	{
		if(cal_VoltageRange == 0)
		{
			AvgNum = 10;
		}
		else
		{
			AvgNum = 3;
		}
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	
	TEK_TriggerInit(cal_chTrigg, "2");
	TEK_Send("trigger:main:edge:slope fall");
	CAL_TekMeasurement(cal_chMeasureUd);
	sleep(1000);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + cal_cntDone++ + " of " + cal_cntTotal + " --");
			CAL_TekScale(cal_chMeasureUd, (VoltageValues[j] / 1000000));
			
			sleep(1000);

			//
			var cal_print_copy = ECDC_CB_Print;
			ECDC_CB_Print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				ECDC_CB_Measure(VoltageValues[j] / cal_LoadResistance, cal_VoltageRangeArrayMax[cal_VoltageRange]);
				sleep(3000);
			}
			
			ECDC_CB_Print = cal_print_copy;
			
			// Unit data
			var ud_read = (r32(252) / Dev).toFixed(2);
			cal_ud.push(ud_read);
			print("Udread, uV: " + ud_read);

			// Scope data
			if (cal_VoltageRange >= 3)
			{
				var ud_sc = (CAL_Measure(cal_chMeasureUd, "3") * 1000).toFixed(2);		
				cal_ud_sc.push(ud_sc);
				print("Udtek, uV: " + ud_sc);
			}
			else
			{
				var ud_sc = (CAL_Measure(cal_chMeasureUd, "6") * 1000000).toFixed(2);		
				cal_ud_sc.push(ud_sc);
				print("Udtek, uV: " + ud_sc);
			}

			// Relative error
			var ud_err = ((ud_read - ud_sc) / ud_sc * 100).toFixed(2);
			cal_ud_err.push(ud_err);
			print("Uderr, %: " + ud_err);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_ResetA()
{	
	// Results storage
	cal_id = [];
	cal_ud = [];

	// Tektronix data
	cal_id_sc = [];
	cal_ud_sc = [];

	// Relative error
	cal_id_err = [];
	cal_ud_err = [];

	// Correction
	cal_id_corr = [];
	cal_ud_corr = [];
}

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_id, cal_id_sc, cal_id_err);
}

function CAL_SaveUd(NameUd)
{
	CGEN_SaveArrays(NameUd, cal_ud, cal_ud_sc, cal_ud_err);
}

function CAL_PrintCoefId()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id range 20mA P0 x1e6  : " + dev.rs(26));
			print("Id range 20mA P1 x1000 : " + dev.rs(27));
			print("Id range 20mA P2 x1000 : " + dev.rs(28));
		}
		break;
		
		case 1:
		{
			print("Id range 200mA P0 x1e6  : " + dev.rs(31));
			print("Id range 200mA P1 x1000 : " + dev.rs(32));
			print("Id range 200mA P2 x1000 : " + dev.rs(33));
		}
		break;
		
		case 2:
		{
			print("Id range 2A P0 x1e6  : " + dev.rs(36));
			print("Id range 2A P1 x1000 : " + dev.rs(37));
			print("Id range 2A P2 x1000 : " + dev.rs(38));
		}
		break;
		
		case 3:
		{
			print("Id range 20A P0 x1e6  : " + dev.rs(41));
			print("Id range 20A P1 x1000 : " + dev.rs(42));
			print("Id range 20A P2 x1000 : " + dev.rs(43));
		}
		break;
		
		case 4:
		{
			print("Id range 270A P0 x1e6  : " + dev.rs(46));
			print("Id range 270A P1 x1000 : " + dev.rs(47));
			print("Id range 270A P2 x1000 : " + dev.rs(48));
		}
		break;
	}
}

function CAL_PrintCoefUd()
{
	switch(cal_VoltageRange)
	{
		case 0:
		{
			print("Ud range 10mV P0 x1e6  : " + dev.rs(64));
			print("Ud range 10mV P1 x1000 : " + dev.rs(65));
			print("Ud range 10mV P2 x1000 : " + dev.rs(66));
		}
		break;
		
		case 1:
		{
			print("Ud range 30mV P0 x1e6  : " + dev.rs(6));
			print("Ud range 30mV P1 x1000 : " + dev.rs(7));
			print("Ud range 30mV P2 x1000 : " + dev.rs(8));
		}
		break;
		
		case 2:
		{
			print("Ud range 250mV P0 x1e6  : " + dev.rs(11));
			print("Ud range 250mV P1 x1000 : " + dev.rs(12));
			print("Ud range 250mV P2 x1000 : " + dev.rs(13));
		}
		break;
		
		case 3:
		{
			print("Ud range 1.5V P0 x1e6  : " + dev.rs(16));
			print("Ud range 1.5V P1 x1000 : " + dev.rs(17));
			print("Ud range 1.5V P2 x1000 : " + dev.rs(18));
		}
		break;
		
		case 4:
		{
			print("Ud range 11V P0 x1e6  : " + dev.rs(21));
			print("Ud range 11V P1 x1000 : " + dev.rs(22));
			print("Ud range 11V P2 x1000 : " + dev.rs(23));
		}
		break;
	}
}

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}

function CAL_ResetUdCal()
{
	CAL_SetCoefUd(0, 1, 0);
}

function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			dev.ws(26, Math.round(P0));
			dev.w(27, Math.round(P1 * 1000));
			dev.ws(28, Math.round(P2 * 1e6));
		}
		break;
		
		case 1:
		{
			dev.ws(31, Math.round(P0));
			dev.w(32, Math.round(P1 * 1000));
			dev.ws(33, Math.round(P2 * 1e6));
		}
		break;
		
		case 2:
		{
			dev.ws(36, Math.round(P0));
			dev.w(37, Math.round(P1 * 1000));
			dev.ws(38, Math.round(P2 * 1e6));
		}
		break;
		
		case 3:
		{
			dev.ws(41, Math.round(P0));
			dev.w(42, Math.round(P1 * 1000));
			dev.ws(43, Math.round(P2 * 1e6));
		}
		break;
		
		case 4:
		{
			dev.ws(46, Math.round(P0));
			dev.w(47, Math.round(P1 * 1000));
			dev.ws(48, Math.round(P2 * 1e6));
		}
		break;
	}
}

function CAL_SetCoefUd(P2, P1, P0)
{
switch(cal_VoltageRange)
	{
		case 0:
		{
			dev.ws(64, Math.round(P0));
			dev.w(65, Math.round(P1 * 1000));
			dev.ws(66, Math.round(P2 * 1e6));
		}
		break;
		
		case 1:
		{
			dev.ws(6, Math.round(P0));
			dev.w(7, Math.round(P1 * 1000));
			dev.ws(8, Math.round(P2 * 1e6));
		}
		break;
		
		case 2:
		{
			dev.ws(11, Math.round(P0));
			dev.w(12, Math.round(P1 * 1000));
			dev.ws(13, Math.round(P2 * 1e6));
		}
		break;
		
		case 3:
		{
			dev.ws(16, Math.round(P0));
			dev.w(17, Math.round(P1 * 1000));
			dev.ws(18, Math.round(P2 * 1e6));
		}
		break;
		
		case 4:
		{
			dev.ws(21, Math.round(P0));
			dev.w(22, Math.round(P1 * 1000));
			dev.ws(23, Math.round(P2 * 1e6));
		}
		break;
	}	
}
