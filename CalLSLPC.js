include("TestLSLPC.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TEK_GetData.js")

// Переменные совместимости
clslpc_Compatibility = 1;	// 0 - если прошивка блока на IAR, 1 - если прошивка на Atolic
clslpc_UseLinearSlope = 0;	// спад тока идёт по линейному закону

// Calibration setup parameters
clslpc_Rshunt = 250;	// in uOhms

// Current range number
clslpc_CurrentRange = 0; // 0 = Range [ <= 350 A]; 1 = Range [ < 1100 A]; 2 = Range [ < 6500 A]
//
clslpc_Points = 10;
//
clslpc_IdMin = [100, 351, 1101];
clslpc_IdMax = [349, 1099, 6500];
//
clslpc_Iterations = 1;
clslpc_SaveImage = 0;

// Counters
clslpc_CntTotal = 0;
clslpc_CntDone = 0;

// Channels
clslpc_chMeasureId = 1;

// Results storage
clslpc_Id = [];
clslpc_IdRaw = [];
clslpc_IdDAC = [];

// Tektronix data
clslpc_IdSc = [];

// Relative error
clslpc_IdErr = [];
clslpc_IdUnitErr = [];

// Correction
clslpc_IdCorr = [];

function CLSLPC_Init(portDevice, portTek, channelMeasureId)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	clslpc_chMeasureId = channelMeasureId;

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

function CLSLPC_TekInit()
{
	TEK_ChannelInit(clslpc_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(clslpc_chMeasureId, "0.04");
	TEK_Horizontal("1e-3", "-1e-3");
	TEK_MeasMaxInit(clslpc_chMeasureId, clslpc_chMeasureId);

	if (clslpc_UseLinearSlope)
	{
		TEK_Send("ch" + clslpc_chMeasureId + ":position -3");
		TEK_Horizontal("2.5e-3", "5e-3");
		dev.w(LSLPC_REG_USE_LINEAR_DOWN, 1);
	}
	else
	{
		TEK_Horizontal("1e-3", "-1e-3");
		if (clslpc_Compatibility)
			dev.w(LSLPC_REG_USE_LINEAR_DOWN, 0);
	}
}
//--------------------

function CLSLPC_CheckRegulatorStatus()
{
	if (dev.r(49) != 0 || dev.r(50) != 0 || dev.r(51) != 0
			 || dev.r(52) != 0 || dev.r(53) != 0 || dev.r(54) != 0)
		return true;
	else
		return false;
}

function CLSLPC_CalibrateDAC()
{
	if(CLSLPC_CheckRegulatorStatus())
	{
		p("Regulator is active. DAC calibration unavailable");
		return;
	}

	CLSLPC_ResetA();
	
	// Tektronix init
	CLSLPC_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(clslpc_IdMin[clslpc_CurrentRange], clslpc_IdMax[clslpc_CurrentRange], clslpc_Points);
	
	if (CLSLPC_CollectId(CurrentArray, clslpc_Iterations))
	{
		CLSLPC_RefreshDACSettings();
		CLSLPC_SaveRawId("LSLPC_IdRaw");

		scattern(clslpc_IdSc, clslpc_IdErr, "Current (in A)", "Error (in %)", "Calibrate current setpoint relative error "
				+ clslpc_IdMin[clslpc_CurrentRange] + " A ... " + clslpc_IdMax[clslpc_CurrentRange] + " A");

		print("Before");
		CLSLPC_PrintCoefIdRaw();

		// Calculate correction
		clslpc_IdCorr = CGEN_GetCorrection("LSLPC_IdRaw");
		CLSLPC_SetCoefIdRaw(clslpc_IdCorr[0], clslpc_IdCorr[1]);
		print("After");
		CLSLPC_PrintCoefIdRaw();
	}
}
//--------------------

function CLSLPC_RefreshDACSettings()
{
	for (var i = 0; i < clslpc_Id.length; i++)
	{
		clslpc_IdRaw[i] = clslpc_IdDAC[i] - dev.r(15);
	}
}

function CLSLPC_ReadCoefDAC()
{
	switch(clslpc_CurrentRange)
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

function CLSLPC_CalibrateId()
{		
	CLSLPC_ResetA();
	CLSLPC_ResetIdCal();
	
	// Tektronix init
	CLSLPC_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(clslpc_IdMin[clslpc_CurrentRange], clslpc_IdMax[clslpc_CurrentRange], clslpc_Points);
	
	if (CLSLPC_CollectId(CurrentArray, clslpc_Iterations))
	{
		CLSLPC_SaveId("LSLPC_Id");

		// Plot relative error distribution
		scattern(clslpc_IdSc, clslpc_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error "
				+ clslpc_IdMin[clslpc_CurrentRange] + " A ... " + clslpc_IdMax[clslpc_CurrentRange] + " A");

		// Calculate correction
		clslpc_IdCorr = CGEN_GetCorrection2("LSLPC_Id");
		CLSLPC_SetCoefId(clslpc_IdCorr[0], clslpc_IdCorr[1], clslpc_IdCorr[2]);
		CLSLPC_PrintCoefId();
	}
}
//--------------------

function CLSLPC_VerifyId()
{		
	CLSLPC_ResetA();
	
	// Tektronix init
	CLSLPC_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(clslpc_IdMin[clslpc_CurrentRange], clslpc_IdMax[clslpc_CurrentRange], clslpc_Points);
	
	if (CLSLPC_CollectId(CurrentArray, clslpc_Iterations))
	{
		CLSLPC_SaveId("LSLPC_Id_fixed");

		// Plot relative error distribution
		scattern(clslpc_IdSc, clslpc_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error "
				+ clslpc_IdMin[clslpc_CurrentRange] + " A ... " + clslpc_IdMax[clslpc_CurrentRange] + " A");
		scattern(clslpc_IdSc, clslpc_IdUnitErr, "Current (in A)", "Error (in %)", "Current unit relative error "
				+ clslpc_IdMin[clslpc_CurrentRange] + " A ... " + clslpc_IdMax[clslpc_CurrentRange] + " A");
	}
}
//--------------------

function CLSLPC_CollectId(CurrentValues, IterationsCount)
{
	clslpc_CntTotal = IterationsCount * CurrentValues.length;
	clslpc_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			TEK_ForceTrig();
			var AvgNum;
			if (CurrentValues[j] * clslpc_Rshunt / 1e6 < 0.1)
			{
				AvgNum = 4;
				TEK_AcquireAvg(AvgNum);
			}
			else
			{
				AvgNum = 1;
				TEK_AcquireSample();
			}
			print("-- result " + clslpc_CntDone++ + " of " + clslpc_CntTotal + " --");
			
			TEK_ScaleVertical(clslpc_chMeasureId, CurrentValues[j] * clslpc_Rshunt / 1e6,
				clslpc_UseLinearSlope ? 77.5 : 90);
			TEK_TriggerPulseInit(clslpc_chMeasureId, CurrentValues[j] * clslpc_Rshunt / 1e6 / 4);
			sleep(1000)
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LSLPC_Start(CurrentValues[j]))
					return false;
			}
			sleep(500)
			
			if (clslpc_Compatibility)
			{
				// DAC data
				var IdDAC = dev.r(202);
				clslpc_IdDAC.push(IdDAC);
				print("DAC,      A: " + IdDAC);
			}
			
			// Unit data
			var IdSet = (clslpc_Compatibility == 1) ? (dev.r(128) / 10) : dev.r(64);
			clslpc_Id.push(IdSet);
			print("Idset,     A: " + IdSet);
			
			// Scope data
			var IdSc = (TEK_Measure(clslpc_chMeasureId) / clslpc_Rshunt * 1e6).toFixed(2);
			clslpc_IdSc.push(IdSc);
			print("Idtek,     A: " + IdSc);

			if (clslpc_Compatibility)
			{
				// Relative error
				var IdUnit = CLSLPC_GetMeasuredCurrent();
				var IdUnitErr = ((IdUnit - IdSc) / IdSc * 100).toFixed(2);
				clslpc_IdUnitErr.push(IdUnitErr);
				print("Idunit,    A: " + IdUnit);
				print("IdunitErr, %: " + IdUnitErr);
			}

			var IdErr = ((IdSc - IdSet) / IdSet * 100).toFixed(2);
			clslpc_IdErr.push(IdErr);
			print("IdSetErr,  %: " + IdErr);
			print("--------------------");
			
			if (clslpc_SaveImage)
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

function CLSLPC_GetMeasuredCurrent()
{
	if(dev.r(203) == 0)
		return dev.r(200) / 10;
	else
		return dev.r(203) + dev.r(204) / 1000;
}
//--------------------

function CLSLPC_ResetA()
{	
	// Results storage
	clslpc_Id = [];
	clslpc_IdRaw = [];
	clslpc_IdDAC = [];

	// Tektronix data
	clslpc_IdSc = [];

	// Relative error
	clslpc_IdErr = [];
	clslpc_IdUnitErr = [];

	// Correction
	clslpc_IdCorr = [];
}
//--------------------

function CLSLPC_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, clslpc_Id, clslpc_IdSc, clslpc_IdUnitErr);
}
//--------------------

function CLSLPC_SaveRawId(NameId)
{
	CGEN_SaveArrays(NameId, clslpc_IdSc, clslpc_IdRaw, clslpc_IdErr);
}
//--------------------

function CLSLPC_ResetIdCal()
{
	CLSLPC_SetCoefId(0, 1, 0);
}
//--------------------

function CLSLPC_SetCoefId(P2, P1, P0)
{
	switch(clslpc_CurrentRange)
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

function CLSLPC_SetCoefIdRaw(K, B)
{
	switch(clslpc_CurrentRange)
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

function CLSLPC_PrintCoefId()
{
	switch(clslpc_CurrentRange)
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

function CLSLPC_PrintCoefIdRaw()
{
	CoefDACObject = CLSLPC_ReadCoefDAC();
	print("IdDAC " + clslpc_CurrentRange + " K x1000		: " + CoefDACObject.K);
	print("IdDAC " + clslpc_CurrentRange + " B x1		: " + CoefDACObject.B);
}
//--------------------
