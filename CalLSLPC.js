include("TestLSLPC.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TEK_GetData.js")

// clslpc_Compatibility задаётся в TestLSLPC.js: 0 — IAR, 1 — Atolic
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
clslpc_IdUnit = [];

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
	LSLPC_ApplyCompatibility();

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

function CLSLPC_ConfirmRun()
{
	print("Коэффициенты регулятора:");
	print("Диапазон 0: Kp (49) = " + dev.r(49) + ", Ki (50) = " + dev.r(50) + ", dKi/dI (55) = " + dev.r(55));
	print("Диапазон 1: Kp (51) = " + dev.r(51) + ", Ki (52) = " + dev.r(52) + ", dKi/dI (56) = " + dev.r(56));
	print("Диапазон 2: Kp (53) = " + dev.r(53) + ", Ki (54) = " + dev.r(54) + ", dKi/dI (57) = " + dev.r(57));

	if (dev.r(73) == 0)
		print("Отслеживание ошибки включено (регистр 73 = 0)");
	else
		print("Отслеживание ошибки выключено (регистр 73 = " + dev.r(73) + ")");

	print("Регистры регулятора и слежения ошибки скрипт не изменяет");

	for (var ask = 1; ask <= 2; ask++)
	{
		print("Подтверждение " + ask + " из 2. Текущее состояние регистров устраивает? Y — продолжить, n — выйти");
		while (true)
		{
			var answer = readline();
			if (answer == "n")
			{
				print("Выход из процедуры");
				return false;
			}
			if (answer == "Y")
				break;
			print("Введите Y для продолжения или n для выхода");
		}
	}

	print("Продолжение работы");
	return true;
}

function CLSLPC_CheckCurrentRange()
{
	if (clslpc_CurrentRange == 0 || clslpc_CurrentRange == 1 || clslpc_CurrentRange == 2)
		return true;

	print("Wrong current range: " + clslpc_CurrentRange);
	return false;
}

function CLSLPC_CalibrateDAC()
{
	if (!CLSLPC_CheckCurrentRange())
		return;

	if (!CLSLPC_ConfirmRun())
		return;

	CLSLPC_ResetA();
	
	// Tektronix init
	CLSLPC_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(clslpc_IdMin[clslpc_CurrentRange], clslpc_IdMax[clslpc_CurrentRange], clslpc_Points);
	
	if (CLSLPC_CollectId(CurrentArray, clslpc_Iterations))
	{
		if (clslpc_IdDAC.length == 0)
			print("DAC codes were not collected. DAC calibration unavailable");
		else
		{
			CLSLPC_RefreshDACSettings();
			CLSLPC_SaveRawId("LSLPC_IdRaw");

			scattern(clslpc_IdSc, clslpc_IdErr, "Current (in A)", "Error (in %)", "Calibrate current setpoint relative error "
					+ clslpc_IdMin[clslpc_CurrentRange] + " A ... " + clslpc_IdMax[clslpc_CurrentRange] + " A");

			print("Before");
			CLSLPC_PrintCoefIdRaw();

			// IdRaw = B + K * IdSc; функция возвращает [B, K]
			var dacCoefficients = CGEN_GetNumericCorrection(clslpc_IdSc, clslpc_IdRaw);
			CLSLPC_SetCoefIdRaw(dacCoefficients[0], dacCoefficients[1]);
			print("After");
			CLSLPC_PrintCoefIdRaw();
		}
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
	var K;
	var B;

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

		default:
		{
			print("Wrong current range: " + clslpc_CurrentRange);
			return null;
		}
	}
	return {K : K, B : B};
}

function CLSLPC_CalibrateADC()
{
	if (!CLSLPC_CheckCurrentRange())
		return;

	if (!clslpc_Compatibility)
	{
		print("ADC calibration requires Atolic firmware");
		return;
	}

	if (dev.r(6) == 0)
	{
		print("Shunt resistance register 6 is 0. ADC calibration unavailable");
		return;
	}

	var coefADC = CLSLPC_ReadCoefADC();
	if (!coefADC || coefADC.D == 0)
	{
		print("ADC denominator is 0. ADC calibration unavailable");
		return;
	}

	if (!CLSLPC_ConfirmRun())
		return;

	CLSLPC_ResetA();
	CLSLPC_ResetIdCal();

	print("Before");
	CLSLPC_PrintCoefADC();

	// Tektronix init
	CLSLPC_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(clslpc_IdMin[clslpc_CurrentRange], clslpc_IdMax[clslpc_CurrentRange], clslpc_Points);

	if (CLSLPC_CollectId(CurrentArray, clslpc_Iterations))
	{
		if (clslpc_IdUnit.length == 0)
			print("Unit current was not collected. ADC calibration unavailable");
		else
		{
			scattern(clslpc_IdSc, clslpc_IdUnitErr, "Current (in A)", "Error (in %)", "Calibrate ADC relative error "
					+ clslpc_IdMin[clslpc_CurrentRange] + " A ... " + clslpc_IdMax[clslpc_CurrentRange] + " A");

			// Uadc = K * ADC + B; функция возвращает [B, K]
			var adcCoefficients = CGEN_GetNumericCorrection(CLSLPC_RawAdcValues(), CLSLPC_UadcScValues());
			CLSLPC_SetCoefADC(adcCoefficients[0], adcCoefficients[1]);
			print("After");
			CLSLPC_PrintCoefADC();
		}
	}
}
//--------------------

function CLSLPC_AdcReg()
{
	return {
		N : 34 + clslpc_CurrentRange * 6,
		D : 35 + clslpc_CurrentRange * 6,
		B : 36 + clslpc_CurrentRange * 6,
		Kamp : 28 + clslpc_CurrentRange
	};
}

function CLSLPC_ReadCoefADC()
{
	if (!CLSLPC_CheckCurrentRange())
		return null;

	var reg = CLSLPC_AdcReg();
	var N = dev.r(reg.N);
	var D = dev.r(reg.D);

	return {N : N, D : D, B : dev.rs(reg.B), K : N / D};
}

function CLSLPC_Kamp()
{
	return dev.r(CLSLPC_AdcReg().Kamp) / 100;
}

function CLSLPC_RawAdcValues()
{
	var coef = CLSLPC_ReadCoefADC();
	var uadc = [];
	var scale = CLSLPC_Kamp() * dev.r(6) / 1000;

	for (var i = 0; i < clslpc_IdUnit.length; i++)
		uadc.push(parseFloat(clslpc_IdUnit[i]) * scale);

	return CGEN_ComputeRawArray(uadc, 0, coef.K, coef.B);
}

function CLSLPC_UadcScValues()
{
	var uadc = [];
	var scale = CLSLPC_Kamp() * dev.r(6) / 1000;

	for (var i = 0; i < clslpc_IdSc.length; i++)
		uadc.push(parseFloat(clslpc_IdSc[i]) * scale);

	return uadc;
}

function CLSLPC_CalibrateId()
{
	if (!CLSLPC_CheckCurrentRange())
		return;

	if (!CLSLPC_ConfirmRun())
		return;

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

		// IdSc = P0 + P1 * IdSet + P2 * IdSet^2; функция возвращает [P0, P1, P2]
		var idCoefficients = CGEN_GetNumericCorrection2(clslpc_Id, clslpc_IdSc);
		CLSLPC_SetCoefId(idCoefficients[0], idCoefficients[1], idCoefficients[2]);
		CLSLPC_PrintCoefId();
	}
}
//--------------------

function CLSLPC_VerifyId()
{
	if (!CLSLPC_CheckCurrentRange())
		return;

	if (!CLSLPC_ConfirmRun())
		return;

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
			
			var lslpc_print_copy = lslpc_print;
			lslpc_print = 0;
			var pulseOk = true;
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LSLPC_Start(CurrentValues[j]))
				{
					pulseOk = false;
					break;
				}
			}
			lslpc_print = lslpc_print_copy;
			if (!pulseOk)
				return false;
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
				clslpc_IdUnit.push(IdUnit);
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
	clslpc_IdUnit = [];

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

function CLSLPC_SetCoefId(P0, P1, P2)
{
	switch(clslpc_CurrentRange)
	{
		case 0:
		{
			dev.ws(31, Math.round(P2 * 1e6));
			dev.w(32, Math.round(P1 * 1000));
			dev.ws(33, Math.round(P0 * 10));
		}
		break;
		
		case 1:
		{
			dev.ws(37, Math.round(P2 * 1e6));
			dev.w(38, Math.round(P1 * 1000));
			dev.ws(39, Math.round(P0 * 10));
		}
		break;
		
		case 2:
		{
			dev.ws(43, Math.round(P2 * 1e6));
			dev.w(44, Math.round(P1 * 1000));
			dev.ws(45, Math.round(P0 * 10));
		}
		break;

		default:
		{
			print("Wrong current range: " + clslpc_CurrentRange);
		}
		break;
	}
}
//--------------------

function CLSLPC_SetCoefIdRaw(B, K)
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

		default:
		{
			print("Wrong current range: " + clslpc_CurrentRange);
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

		default:
		{
			print("Wrong current range: " + clslpc_CurrentRange);
		}
		break;
	}
}
//--------------------

function CLSLPC_SetCoefADC(B, K)
{
	var reg = CLSLPC_AdcReg();

	dev.w(reg.N, Math.round(K * 1000));
	dev.w(reg.D, 1000);
	dev.ws(reg.B, Math.round(B));
}
//--------------------

function CLSLPC_PrintCoefADC()
{
	var reg = CLSLPC_AdcReg();
	var coef = CLSLPC_ReadCoefADC();
	if (!coef)
		return;

	print("ADC " + clslpc_CurrentRange + " N (reg " + reg.N + "): " + coef.N);
	print("ADC " + clslpc_CurrentRange + " D (reg " + reg.D + "): " + coef.D);
	print("ADC " + clslpc_CurrentRange + " B (reg " + reg.B + "): " + coef.B);
	print("ADC " + clslpc_CurrentRange + " K = N/D: " + coef.K);
	print("ADC " + clslpc_CurrentRange + " Kamp x100 (reg " + reg.Kamp + "): " + dev.r(reg.Kamp));
	print("Rshunt, uOhm (reg 6): " + dev.r(6));
}
//--------------------

function CLSLPC_PrintCoefIdRaw()
{
	var CoefDACObject = CLSLPC_ReadCoefDAC();
	if (!CoefDACObject)
		return;

	print("IdDAC " + clslpc_CurrentRange + " K x1000		: " + CoefDACObject.K);
	print("IdDAC " + clslpc_CurrentRange + " B x1		: " + CoefDACObject.B);
}
//--------------------
