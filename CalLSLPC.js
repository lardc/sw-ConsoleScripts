include("TestLSLPC.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TEK_GetData.js")

// Переменные совместимости
cal_LSLPC_Compatibility = 1; // 0 - если прошивка блока на IAR, 1 - если прошивка на Atolic
cal_LSLPC_USE_LINEAR_DOWN = 0; // спад тока идёт по линейному закону

// Calibration setup parameters
cal_Rshunt = 250;	// in uOhms

// Current range number
cal_CurrentRange = 0; // 0 = Range [ <= 350 A]; 1 = Range [ < 1100 A]; 2 = Range [ < 6500 A]
//
cal_Points = 10;
//
cal_IdMin = [100, 351, 1101];
cal_IdMax = [349, 1099, 6500];
//
cal_Iterations = 1;
cal_SaveImage = 0;

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureId = 1;

// Results storage
cal_Id = [];
cal_IdRaw = [];
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

function CAL_TekInit()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(cal_chMeasureId, "0.04");
	TEK_Horizontal("1e-3", "-1e-3");
	TEK_MeasMaxInit(cal_chMeasureId, cal_chMeasureId);

	if (cal_LSLPC_USE_LINEAR_DOWN)
	{
		TEK_Send("ch" + cal_chMeasureId + ":position -3");
		TEK_Horizontal("2.5e-3", "5e-3");
		dev.w(LSLPC_REG_USE_LINEAR_DOWN, 1);
	}
	else
	{
		TEK_Horizontal("1e-3", "-1e-3");
		dev.w(LSLPC_REG_USE_LINEAR_DOWN, 0);
	}
}
//--------------------

function CAL_CheckRegulatorStatus()
{
	if (dev.r(49) != 0 || dev.r(50) != 0 || dev.r(51) != 0
			 || dev.r(52) != 0 || dev.r(53) != 0 || dev.r(54) != 0)
		return true;
	else
		return false;
}

function CAL_CalibrateDAC()
{
	if(CAL_CheckRegulatorStatus())
	{
		p("Regulator is active. DAC calibration unavailable");
		return;
	}

	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_Points);
	
	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_RefreshDACSettings();
		CAL_SaveRawId("LSLPC_IdRaw");

		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Calibrate current setpoint relative error "
				+ cal_IdMin[cal_CurrentRange] + " A ... " + cal_IdMax[cal_CurrentRange] + " A");

		print("Before");
		CAL_PrintCoefIdRaw();

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection("LSLPC_IdRaw");
		CAL_SetCoefIdRaw(cal_IdCorr[0], cal_IdCorr[1]);
		print("After");
		CAL_PrintCoefIdRaw();
	}
}
//--------------------

function CAL_RefreshDACSettings()
{
	for (var i = 0; i < cal_Id.length; i++)
	{
		cal_IdRaw[i] = cal_IdDAC[i] - dev.r(15);
	}
}

function CAL_ReadCoefDAC()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			K = dev.rs(20);
			B = dev.rs(21);
		}
		break;
		
		case 1:
		{
			K = dev.rs(22);
			B = dev.rs(23);
		}
		break;
		
		case 2:
		{
			K = dev.rs(24);
			B = dev.rs(25);
		}
		break;
	}
	return {K : K, B : B};
}

function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_Points);
	
	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LSLPC_Id");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error "
				+ cal_IdMin[cal_CurrentRange] + " A ... " + cal_IdMax[cal_CurrentRange] + " A");

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

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error "
				+ cal_IdMin[cal_CurrentRange] + " A ... " + cal_IdMax[cal_CurrentRange] + " A");
		scattern(cal_IdSc, cal_IdUnitErr, "Current (in A)", "Error (in %)", "Current unit relative error "
				+ cal_IdMin[cal_CurrentRange] + " A ... " + cal_IdMax[cal_CurrentRange] + " A");
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
			TEK_ForceTrig();
			var AvgNum;
			if (CurrentValues[j] * cal_Rshunt / 1e6 < 0.1)
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
			if (cal_LSLPC_USE_LINEAR_DOWN)
				TEK_ScaleVertical(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1e6, 77.5);
			else
				TEK_ScaleVertical(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1e6, 90);
			
			TEK_TriggerPulseInit(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1e6 / 4);
			
			sleep(1000)

			for (var k = 0; k < AvgNum; k++)
			{
				if(!LSLPC_Start(CurrentValues[j]))
					return false;
			}
			
			// DAC data
			var IdDAC = dev.r(202);
			cal_IdDAC.push(IdDAC);
			//print("DAC,      pt: " + IdDAC);

			sleep(500)
			// Unit data
			var IdSet;
			(cal_LSLPC_Compatibility == 1) ? IdSet = dev.r(128) / 10 : IdSet = dev.r(64);
			cal_Id.push(IdSet);
			print("Idset,     A: " + IdSet);
			
			// Scope data
			var IdSc = (TEK_Measure(cal_chMeasureId) / cal_Rshunt * 1e6).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek,     A: " + IdSc);

			// Relative error
			var IdUnit = dev.r(200) / 10;
			var IdUnitErr = ((IdUnit - IdSc) / IdSc * 100).toFixed(2);
			cal_IdUnitErr.push(IdUnitErr);
			print("Idunit,    A: " + IdUnit);
			print("IdunitErr, %: " + IdUnitErr);

			var IdErr = ((IdSc - IdSet) / IdSet * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr,  %: " + IdErr);
			print("--------------------");
			
			if (cal_SaveImage)
			{
				var NameFile = "" + IdSet + "";
				var SaveImage = "save:image \"A:\\" + NameFile + ".BMP\"";
				TEK_Send(SaveImage);
				sleep(8000);
				TEK_Busy();
			}

			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];
	cal_IdRaw = [];
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
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdUnitErr);
}
//--------------------

function CAL_SaveRawId(NameId)
{
	CGEN_SaveArrays(NameId, cal_IdSc, cal_IdRaw, cal_IdErr);
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

function CAL_SetCoefIdRaw(K, B)
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			dev.w(20, Math.round(K * 1000));
			dev.ws(21, Math.round(B));
		}
		break;
		
		case 1:
		{
			dev.w(22, Math.round(K * 1000));
			dev.ws(23, Math.round(B));
		}
		break;
		
		case 2:
		{
			dev.w(24, Math.round(K * 1000));
			dev.ws(25, Math.round(B));
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

function CAL_PrintCoefIdRaw()
{
	CoefDACObject = CAL_ReadCoefDAC();
	print("IdDAC " + cal_CurrentRange + " K x1000		: " + CoefDACObject.K);
	print("IdDAC " + cal_CurrentRange + " B x1		: " + CoefDACObject.B);
}
//--------------------