include("TestLCSU.js")
include("Tektronix.js")
include("CalGeneral.js")

// Calibration setup parameters
cal_Points = 13;

cal_Rshunt = 999;	// uOhm

cal_CurrentRange = 1;

cal_IdMin = [50, 301];	
cal_IdMax = [300, 1700];
cal_IdStp = (cal_IdMax[cal_CurrentRange] - cal_IdMin[cal_CurrentRange]) / cal_Points;

cal_Iterations = 1;
cal_UseAvg = 1;
//		

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureId = 1;
cal_chSync = 3;

// Results storage
cal_Id = [];
cal_IdMes = [];
// Tektronix data
cal_IdSc = [];

// Relative error
cal_IdErr = [];
cal_IdErrMes = [];
//

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

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");
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

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection2("LSLPC_Id");
		CAL_SetCoefId(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefId();
	}
}
//-------------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];

	// Tektronix data
	cal_IdSc = [];

	// Relative error
	cal_IdErr = [];

	// Correction
	cal_IdCorr = [];
}
//--------------------
function CAL_TekInit()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(cal_chMeasureId, "0.04");
	TEK_Horizontal("0.250e-3", "0");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
}
//--------------------

function CAL_CollectId(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
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
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			LCSU_TekScale(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.r(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------
function LCSU_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
	
	TEK_TriggerPulseInit(cal_chMeasureId, Value * 1);
}
//--------------------

function CAL_Measure(Channel)
{
	return TEK_Measure(Channel);
}
//--------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}
//--------------------

function CAL_CollectMesure(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
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
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			LCSU_TekScale(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.rf(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Unit data
			var IdMes = dev.rf(200);
			cal_IdMes.push(IdMes);
			print("IdMes, A: " + IdMes);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(3);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);

			var IdErrMes = ((IdMes - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErrMes.push(IdErrMes);
			print("IdMesErr, %: " + IdErrMes);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_VerifyMesure()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErrMes, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateMesure()
{		
	CAL_ResetA();
	CAL_ResetIdCalMes()
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		cal_IdCorr = CGEN_GetCorrection2("LCSU_Id_fixed");
		CAL_SetCoefIdMes(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefIdMes();
	}
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
			dev.wf(20, P2);
			dev.wf(21, P1);
			dev.wf(22, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(25, P2);
			dev.wf(26, P1);
			dev.wf(27, P0);
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
			print("Id 0 P2	: " + dev.rf(20));
			print("Id 0 P1	: " + dev.rf(21));
			print("Id 0 P0	: " + dev.rf(22));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(25));
			print("Id 1 P1	: " + dev.rf(26));
			print("Id 1 P0	: " + dev.rf(27));
		}
		break
	}
}
//--------------------
function CAL_SetCoefIdMes(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(34, P2);
			dev.wf(35, P1);
			dev.wf(36, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(39, P2);
			dev.wf(40, P1);
			dev.wf(41, P0);
		}
		break;
	}		
}
//--------------------

function CAL_ResetIdCalMes()
{
	CAL_SetCoefIdMes(0, 1, 0);
}
//--------------------
function CAL_PrintCoefIdMes()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2	: " + dev.rf(34));
			print("Id 0 P1	: " + dev.rf(35));
			print("Id 0 P0	: " + dev.rf(36));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(39));
			print("Id 1 P1	: " + dev.rf(40));
			print("Id 1 P0	: " + dev.rf(41));
		}
		break
	}
}
//--------------------