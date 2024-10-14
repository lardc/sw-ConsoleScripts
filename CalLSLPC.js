include("TestLSLPC.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TEK_GetData.js")

// Переменные совместимости
cal_LSLPC_Compatibility = 1; // 0 - если прошивка блока на IAR, 1 - если прошивка на Atolic

// Calibration setup parameters
cal_Rshunt = 750;	// in uOhms

// Current range number
cal_CurrentRange = 0; // 0 = Range [ <= 1000 A]; 1 = Range [ < 6500 A]
//
cal_Points = 10;
//
cal_IdMin = [100, 1001];
cal_IdMax = [1000, 6500];
//
cal_Iterations = 1;
cal_UseAvg = 1;

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureId = 1;

// Results storage
cal_Id = [];
cal_IdDAC = [];

// Tektronix data
cal_IdSc = [];

// Relative error
cal_IdErr = [];
cal_IdUnitErr = [];

// Correction
cal_IdCorr = [];

function CAL_Init(portDevice, portTek, channelMeasureId)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureId = channelMeasureId;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}
//--------------------

function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureId);

	// Reload values
	var cal_IdStp = Math.round((cal_IdMax[cal_CurrentRange] - cal_IdMin[cal_CurrentRange]) / (cal_Points - 1));
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LSLPC_Id");
		CAL_SaveRawId("LSLPC_DAC_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection2("LSLPC_Id");
		CAL_SetCoefId(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefId();
	}
}
//--------------------

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_Points);
	
	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LSLPC_Id_fixed");
		CAL_SaveRawId("LSLPC_DAC_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");
		scattern(cal_IdSc, cal_IdUnitErr, "Current (in A)", "Error (in %)", "Current unit relative error");
	}
}
//--------------------

function CAL_CollectId(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			var AvgNum;
			if (CurrentValues[j] * cal_Rshunt / 1000000 < 0.3)
			{
				AvgNum = 4;
				TEK_AcquireAvg(AvgNum);
			}
			else
			{
				AvgNum = 1;
				TEK_AcquireSample();
			}

			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			CAL_TekScale(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LSLPC_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet;
			(cal_LSLPC_Compatibility == 1) ? IdSet = dev.r(128) / 10 : IdSet = dev.r(64);
			cal_Id.push(IdSet);
			print("Idset,     A: " + IdSet);
			// print("IdsetRaw, A: " + (dev.r(21) * Math.pow(IdSet, dev.r(20) / 1000)).toFixed(0)); // для грубой калибровки

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek,     A: " + IdSc);

			// DAC data
			Id_DACArray = dev.rafs(6);
			var IdDAC = TEK_GD_MAX(Id_DACArray).Value;
			cal_IdDAC.push(IdDAC);
			print("DAC,      pt: " + IdDAC);

			// Relative error
			Id_UnitArray = dev.rafs(1);
			var IdUnit = TEK_GD_Sinus_MAX(Id_UnitArray)
			IdUnitErr = ((IdUnit - IdSc) / IdSc * 100).toFixed(2);
			cal_IdUnitErr.push(IdUnitErr);
			print("Idunit,    A: " + IdUnit);
			print("IdunitErr, %: " + IdUnitErr);

			var IdErr = ((IdSc - IdSet) / IdSet * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr,  %: " + IdErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------

function CAL_TekScale(Channel, Value)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
	
	TEK_TriggerPulseInit(cal_chMeasureId, Value / 5);
	//while(TEK_Exec("TRIGger:STATE?") != "REA") // закомментировать для TPS2014
		sleep(500);
}
//--------------------

function CAL_TekInit()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(cal_chMeasureId, "0.04");
	TEK_Horizontal("1e-3", "-2e-3");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
}
//--------------------

function CAL_Measure(Channel)
{
	//while(TEK_Exec("TRIGger:STATE?") != "REA")  // закомментировать для TPS2014
		sleep(500);
	return TEK_Measure(Channel);
}
//--------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];
	cal_IdDAC = [];

	// Tektronix data
	cal_IdSc = [];

	// Relative error
	cal_IdErr = [];
	cal_IdUnitErr = [];

	// Correction
	cal_IdCorr = [];
}
//--------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}
//--------------------

function CAL_SaveRawId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdDAC);
}
//--------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}
//--------------------

function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.ws(31, Math.round(P2 * 1e6));
			dev.w(32, Math.round(P1 * 1000));
			dev.ws(33, Math.round(P0) * 10);
		}
		break;
		
		case 1:
		{
			dev.ws(37, Math.round(P2 * 1e6));
			dev.w(38, Math.round(P1 * 1000));
			dev.ws(39, Math.round(P0) * 10);
		}
		break;
		
		case 2:
		{
			dev.ws(43, Math.round(P2 * 1e6));
			dev.w(44, Math.round(P1 * 1000));
			dev.ws(45, Math.round(P0) * 10);
		}
		break;
	}		
}
//--------------------

function CAL_PrintCoefId()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2 x1e6		: " + dev.rs(31));
			print("Id 0 P1 x1000	: " + dev.rs(32));
			print("Id 0 P0 x10		: " + dev.rs(33));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2 x1e6		: " + dev.rs(37));
			print("Id 1 P1 x1000	: " + dev.rs(38));
			print("Id 1 P0 x10		: " + dev.rs(39));
		}
		break;
		
		case 2:
		{
			print("Id 2 P2 x1e6		: " + dev.rs(43));
			print("Id 2 P1 x1000	: " + dev.rs(44));
			print("Id 2 P0 x10		: " + dev.rs(45));
		}
		break;
	}
}
//--------------------