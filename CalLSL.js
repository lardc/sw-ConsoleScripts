include("TestLSLH.js")
include("TestSL.js")
include("Tektronix.js")
include("CalGeneral.js")
include("DMM6500.js")
include("Numeric.js")

// Calibration setup parameters
clsl_Rshunt = 750;					// in uOhms
clsl_Rload = 3333;					// in uOhms
clsl_GateRshunt = 10000;			// in mOhms

// Setup parameters for DMM6000
clsl_V_PulsePlate 	= 5000 			// in us
clsl_V_TriggerDelay	= 2500e-6		// in s
clsl_measuring_device = "TPS2000";	// "DMM6000" or "TPS2000"

// Current range number
clsl_CurrentRange = 0;				// 0 — нижний диапазон (до 1200 A); 1 — верхний (до 12600 A)
//
clsl_Points = 10;					// число точек во всех диапазонах
//
clsl_UtmMin = 500;					// in mV
clsl_UtmMax = 5000;					// in mV
//
clsl_ItmMin = 100					// in A
clsl_ItmMax = 1500					// in A
//
clsl_IgMin = 100;					// in mA
clsl_IgMax = 1000;					// in mA
//
clsl_UgMin = 1000;					// in mV
clsl_UgMax = 11000;					// in mV
//
clsl_Iterations = 1;
clsl_CoolDownPerA = 3;				// пауза на остывание после точки Utm, мс на 1 А тока

// ШИМ и линейный IAR, измерение через SL_Sin
clsl_ShuntRes = 0;					// in mOhms, read from block
clsl_ForceShuntRes = 0;				// force shunt resistance (in mOhms)
clsl_DUTRes = 1;					// in mOhms
clsl_DUTConst = 0;					// in mV
clsl_UseRangeTuning = 1;
clsl_Imin = 400;					// in A
clsl_Imax = 8000;					// in A
clsl_ImaxV = 0;						// in A, считается из clsl_Vmax или clsl_Vfsmax
clsl_Vmax = 4500;					// in mV
clsl_Vfsmax = 3500;					// in mV

// Measurement errors, %
clsl_EUosc = 3;						// осциллограф
clsl_ERshunt = 0.5;					// шунт, один для всех версий

// Counters
clsl_CntTotal = 0;
clsl_CntDone = 0;

// Channels
clsl_chMeasureI = 1;
clsl_chMeasureU = 2;
clsl_chSync = 3;

// Опорное напряжение и разрядность АЦП, Global.h прошивки LSLH
clsl_AdcRefMv = 3300;
clsl_AdcResolution = 4095;

CLSL_ResetA();

// Init
//----------------------------------------------------------------------------------
// Nid: 0 — блок напрямую по RS-232, 2 — блок на CAN за платой ControlUnitBoard
function CLSL_Init_Tek(portDevice, nid, portTek, channelMeasureI, channelMeasureU, channelSync)
{
	if (!CLSL_ChannelOk(channelMeasureI) || !CLSL_ChannelOk(channelMeasureU) || !CLSL_ChannelOk(channelSync))
	{
		print("Wrong channel numbers");
		return;
	}

	CLSL_ConnectDevice(portDevice, nid);

	clsl_chMeasureU = channelMeasureU;
	clsl_chMeasureI = channelMeasureI;
	clsl_chSync = channelSync;

	TEK_PortInit(portTek);
	TEK_ChannelInit(clsl_chMeasureI, "1", "1");
	TEK_ChannelInit(clsl_chMeasureU, "1", "1");
	CLSL_SyncInit();
	if (CLSL_UseCursor())
	{
		CLSL_TekCursor(clsl_chMeasureU);
		CLSL_TekCursor(clsl_chMeasureI);
	}
}

function CLSL_Init_DMM(portDevice, nid)
{
	CLSL_ConnectDevice(portDevice, nid);
	KEI_Reset();
}

function CLSL_ConnectDevice(portDevice, nid)
{
	dev.Disconnect();
	dev.co(portDevice);
	dev.nid(nid);
	print("Nid " + nid + (nid == 0 ? ", RS-232" : ", CAN"));
	PrintFWInfo();
	LSLH_CheckVersion();
}

function CLSL_ChannelOk(Channel)
{
	return Channel >= 1 && Channel <= 4;
}

// Каналы измерения и синхронизации включены, остальные выключены, триггер по синхронизации
function CLSL_SyncInit()
{
	for (var i = 1; i <= 4; i++)
	{
		if (i == clsl_chMeasureU || i == clsl_chMeasureI || i == clsl_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	TEK_ChannelInit(clsl_chSync, "1", CLSL_UseCursor() ? "0.5" : "1");
	TEK_TriggerInit(clsl_chSync, CLSL_UseCursor() ? "0.15" : "2.5");
	TEK_Send("trigger:main:edge:slope fall");
}

function CLSL_RequireLinear()
{
	LSLH_CheckVersion();
	if (LSLH_Linear)
		return true;

	print("Команда только для линейного блока, включая SCHead. Сейчас: " + LSLH_VersionText);
	return false;
}

function CLSL_RequireGateControl()
{
	LSLH_CheckVersion();
	if (LSLH_GateControl)
		return true;

	print("Калибровка управления только для линейного блока без SCHead и без ШИМ. Сейчас: " + LSLH_VersionText);
	return false;
}

function CLSL_RequirePwmOrIar()
{
	LSLH_CheckVersion();
	if (LSLH_PWM || LSLH_LinearIAR)
		return true;

	print("Команда только для ШИМ и линейного IAR. Сейчас: " + LSLH_VersionText);
	return false;
}

function CLSL_GetRange(Min, Max)
{
	var Step = (clsl_Points > 1) ? Math.round((Max - Min) / (clsl_Points - 1)) : (Max - Min);
	return CGEN_GetRange(Min, Max, Step);
}

// ШИМ и линейный IAR меряются курсорами осциллографа, синхронизация 0.15 В.
// Линейный Atolic — measurement maximum, синхронизация 2.5 В.
function CLSL_UseCursor()
{
	return LSLH_PWM || LSLH_LinearIAR;
}

// Относительная погрешность, %
// Измерение: (показание блока - эталон) / эталон
function CLSL_ErrMeasure(Read, Reference)
{
	return (Read - Reference) / Reference * 100;
}

// Задание: (эталон - задание) / задание
function CLSL_ErrSet(Reference, Set)
{
	return (Reference - Set) / Set * 100;
}

// Суммарная погрешность, %: знак · (|δ| + E). Для напряжения E — погрешность осциллографа,
// для тока E0 = 1.1 · √(Eosc² + Eшунт²).
function CLSL_ErrE0()
{
	return 1.1 * Math.sqrt(Math.pow(clsl_EUosc, 2) + Math.pow(clsl_ERshunt, 2));
}

function CLSL_ErrSum(Err, E)
{
	return (Math.sign_ma(Err) * (Math.abs(Err) + E)).toFixed(2);
}

// Измерительный прибор: осциллограф или DMM6500
//----------------------------------------------------------------------------------
function CLSL_IsTek()
{
	return clsl_measuring_device == "TPS2000";
}

function CLSL_MeterName()
{
	return CLSL_IsTek() ? "tek" : "DMM";
}

function CLSL_MeterDigits()
{
	return CLSL_IsTek() ? 2 : 3;
}

function CLSL_InitMeter(Channel, Gate)
{
	if (CLSL_IsTek())
	{
		if (Gate)
			CLSL_GateTekInit(Channel);
		else
			CLSL_TekInit(Channel);
	}
	else
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}
}

// Усреднение 4 импульсов у осциллографа на малом сигнале. Возвращает число импульсов.
function CLSL_TekAcquire(UseAvg)
{
	if (UseAvg)
	{
		TEK_AcquireAvg(4);
		return 4;
	}

	TEK_AcquireSample();
	return 1;
}

function CLSL_MeterAcquire(UseAvg)
{
	return CLSL_IsTek() ? CLSL_TekAcquire(UseAvg) : 1;
}

function CLSL_MeterScale(Channel, Volts)
{
	if (CLSL_IsTek())
		CLSL_TekScale(Channel, Volts);
	else
	{
		KEI_SetVoltageRange(Volts);
		KEI_ActivateTrigger();
	}
}

// Результат в вольтах
function CLSL_MeterRead(Channel)
{
	return parseFloat(CLSL_IsTek() ? CLSL_Measure(Channel) : KEI_ReadArrayMaximum());
}

// Count импульсов без печати. 0 — ошибка или прерывание.
function CLSL_Pulses(Current, Count)
{
	var PrintTemp = LSLH_Print;
	LSLH_Print = 0;

	try
	{
		for (var k = 0; k < Count; k++)
			if (!LSLH_StartMeasure(Current))
				return 0;
	}
	finally
	{
		LSLH_Print = PrintTemp;
	}

	return 1;
}

// Только линейный Atolic: регистр 40 — ограничение выброса тока.
// У ШИМ и линейного IAR регистр 40 — Vfs P1, его не трогаем.
var OvershootCurrent;

function OverShootCurrentReset()
{
	if (!LSLH_Linear)
		return;

	OvershootCurrent = dev.r(40);
	dev.w(40, 0);
}

function OverShootCurrentRestore()
{
	if (!LSLH_Linear)
		return;

	dev.w(40, OvershootCurrent);
}

// Линейный блок: Utm, Itm, ADC, Iset
//----------------------------------------------------------------------------------
function CLSL_CalibrateUtm()
{
	CLSL_RunUtm(true);
}

function CLSL_VerifyUtm()
{
	CLSL_RunUtm(false);
}

function CLSL_RunUtm(Calibrate)
{
	if (!CLSL_RequireLinear())
		return;

	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetUtmCal();

	OverShootCurrentReset();
	CLSL_InitMeter(clsl_chMeasureU, false);

	if (CLSL_CollectUtm(CLSL_GetRange(clsl_UtmMin, clsl_UtmMax), clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";
		var Range = clsl_UtmMin + " ... " + clsl_UtmMax + " mV";

		CLSL_SaveUtm(Calibrate ? "LSL_Utm" : "LSL_Utm_fixed");
		scattern(clsl_UtmSc, clsl_UtmErr, "Voltage (in mV)", "Error (in %)", Mode + ", Utm relative error " + Range);

		if (Calibrate)
		{
			var Corr = CGEN_GetCorrection2("LSL_Utm");
			CLSL_CalUtm(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefUtm();
		}
		else
			scattern(clsl_UtmSc, clsl_UtmErr_sum, "Voltage (in mV)", "Error (in %)", Mode + ", Utm summary error " + Range);
	}

	OverShootCurrentRestore();
}

function CLSL_CalibrateItm()
{
	CLSL_RunItm(true);
}

function CLSL_VerifyItm()
{
	CLSL_RunItm(false);
}

function CLSL_RunItm(Calibrate)
{
	if (!CLSL_RequireLinear())
		return;

	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetItmCal();

	OverShootCurrentReset();
	CLSL_InitMeter(clsl_chMeasureI, false);

	if (CLSL_CollectItm(CLSL_GetRange(clsl_ItmMin, clsl_ItmMax), clsl_Iterations))
	{
		CLSL_SaveItm(Calibrate ? "LSL_Itm" : "LSL_Itm_fixed");
		scattern(clsl_ItmSc, clsl_ItmErr, "Current (in A)", "Error (in %)", (Calibrate ? "Calibrate" : "Verify")
				+ ", Itm relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");

		if (Calibrate)
		{
			var Corr = CGEN_GetCorrection2("LSL_Itm");
			CLSL_CalItm(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefItm();
		}
	}

	OverShootCurrentRestore();
}

// Грубая подстройка АЦП измерения тока: пишет Offset и K, полином P2, P1, P0 сбрасывает в 0, 1, 0.
// I = (ADC + Offset) * ADC_REF_MV / ADC_RESOLUTION * K / Rshunt
// Rshunt = рег. 0 / 1000 (мОм), K = рег. K / 1000, Offset — знаковые тики АЦП.
function CLSL_CalibrateADC()
{
	if (!CLSL_RequireLinear())
		return;

	var reg = CLSL_ItmAdcReg();
	if (!reg)
		return;

	if (dev.r(0) == 0)
	{
		print("Shunt resistance register 0 is 0. ADC calibration unavailable");
		return;
	}

	var coef = CLSL_ReadCoefADC(reg);
	if (coef.K == 0)
	{
		print("ADC K is 0. ADC calibration unavailable");
		return;
	}

	// Регистры, которые меняет грубая подстройка: Offset и K АЦП, полином тонкой подстройки
	var regList = CLSL_ItmAdcRegList(reg);
	var before = CLSL_ReadRegList(regList);

	CLSL_ResetA();
	CLSL_ResetItmCal();

	OverShootCurrentReset();
	CLSL_InitMeter(clsl_chMeasureI, false);

	if (CLSL_CollectItm(CLSL_GetRange(clsl_ItmMin, clsl_ItmMax), clsl_Iterations))
	{
		scattern(clsl_ItmSc, clsl_ItmErr, "Current (in A)", "Error (in %)", "Calibrate, ADC Itm relative error "
				+ clsl_ItmMin + " ... " + clsl_ItmMax + " A");

		// Сырой код АЦП: u = (ADC + Offset) * K  =>  ADC = u / K - Offset
		var raw = [];
		var unitCode = CLSL_AdcCodeValues(clsl_Itm);
		for (var i = 0; i < unitCode.length; i++)
			raw.push(unitCode[i] / coef.K - coef.Offset);

		// u_ref = B + K * ADC, Offset = B / K
		var adc = CGEN_NumericCorrection(raw, CLSL_AdcCodeValues(clsl_ItmSc));
		CLSL_SetCoefADC(reg, adc[0], adc[1]);
	}
	else
		print("Прервано. Offset и K не записаны, полином сброшен в 0, 1, 0.");

	OverShootCurrentRestore();
	CLSL_PrintRegChange("Грубая подстройка АЦП Itm, диапазон " + clsl_CurrentRange, regList, before);
}

function CLSL_CalibrateIset()
{
	CLSL_RunIset(true);
}

function CLSL_VerifyIset()
{
	CLSL_RunIset(false);
}

function CLSL_RunIset(Calibrate)
{
	LSLH_CheckVersion();

	if (LSLH_PWM)
	{
		CLSL_RunIsetPwm(Calibrate);
		return;
	}

	if (!LSLH_Linear && !LSLH_LinearIAR)
	{
		print("Команда уставки для этой версии недоступна. Сейчас: " + LSLH_VersionText);
		return;
	}

	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetIsetCal();

	OverShootCurrentReset();
	CLSL_InitMeter(clsl_chMeasureI, false);

	if (CLSL_CollectIset(CLSL_GetRange(clsl_ItmMin, clsl_ItmMax), clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";
		var Range = clsl_ItmMin + " ... " + clsl_ItmMax + " A";

		CLSL_SaveIset(Calibrate ? "LSL_Iset" : "LSL_Iset_fixed");
		scattern(clsl_IsetSc, clsl_IsetErr, "Current (in A)", "Error (in %)", Mode + ", Itm set relative error " + Range);

		if (Calibrate)
		{
			var Corr = CGEN_GetCorrection2("LSL_Iset");
			CLSL_CalIset(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefIset();
		}
		else
			scattern(clsl_IsetSc, clsl_IsetErr_sum, "Current (in A)", "Error (in %)", Mode + ", Itm summary error " + Range);
	}

	OverShootCurrentRestore();
}

// ШИМ и линейный IAR: I, V, Vfs, уставка ШИМ
//----------------------------------------------------------------------------------
function CLSL_RunIsetPwm(Calibrate)
{
	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetIsetCal();

	dev.w(162, 1);

	if (CLSL_Collect(CLSL_GetRange(clsl_Imin, clsl_Imax), 0, clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";

		CLSL_SaveIsetPwm(Calibrate ? "sl_iset" : "sl_iset_fixed");
		scattern(clsl_i_set, clsl_iset_err, "Current (in A)", "Error (in %)", Mode + ", Current setpoint relative error");

		if (Calibrate)
		{
			var Corr = CGEN_GetCorrection2("sl_iset");
			CLSL_CalIset(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefIset();
		}
		else
			scattern(clsl_i_set, clsl_iset_err_sum, "Current (in A)", "Error (in %)", Mode + ", Current setpoint summary error");
	}
}

function CLSL_CalibrateI()
{
	CLSL_RunI(true);
}

function CLSL_VerifyI()
{
	CLSL_RunI(false);
}

function CLSL_RunI(Calibrate)
{
	if (!CLSL_RequirePwmOrIar())
		return;

	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetICal();

	dev.w(162, 1);

	if (CLSL_Collect(CLSL_GetRange(clsl_Imin, clsl_Imax), 0, clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";

		CLSL_SaveI(Calibrate ? "sl_i" : "sl_i_fixed");
		scattern(clsl_i_sc, clsl_i_err, "Current (in A)", "Error (in %)", Mode + ", Current relative error");

		if (Calibrate)
		{
			if (CGEN_UseQuadraticCorrection())
			{
				var Corr = CGEN_GetCorrection2("sl_i");
				CLSL_CalI2(Corr[0], Corr[1], Corr[2]);
			}
			else
			{
				var Corr = CGEN_GetCorrection("sl_i");
				CLSL_CalI(Corr[0], Corr[1]);
			}

			CLSL_PrintICal();
		}
		else
			scattern(clsl_i_sc, clsl_i_err_sum, "Current (in A)", "Error (in %)", Mode + ", Current summary error");
	}
}

function CLSL_CalibrateV()
{
	CLSL_RunV(true, false);
}

function CLSL_VerifyV()
{
	CLSL_RunV(false, false);
}

function CLSL_CalibrateVfs()
{
	CLSL_RunV(true, true);
}

function CLSL_VerifyVfs()
{
	CLSL_RunV(false, true);
}

// FullScale: false — напряжение (рег. 162 = 0, предел clsl_Vmax), true — напряжение FS (рег. 162 = 1, предел clsl_Vfsmax)
function CLSL_RunV(Calibrate, FullScale)
{
	if (!CLSL_RequirePwmOrIar())
		return;

	CLSL_ResetA();
	if (Calibrate)
	{
		if (FullScale)
			CLSL_ResetVfsCal();
		else
			CLSL_ResetVCal();
	}

	dev.w(162, FullScale ? 1 : 0);
	CLSL_LimitVoltageCurrent(FullScale ? clsl_Vfsmax : clsl_Vmax);

	if (CLSL_Collect(CLSL_GetRange(clsl_Imin, clsl_ImaxV), 1, clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";
		var Name = FullScale ? "sl_vfs" : "sl_v";
		var Label = FullScale ? "Voltage FS" : "Voltage";

		CLSL_SaveV(Calibrate ? Name : Name + "_fixed");
		scattern(clsl_v_sc, clsl_v_err, Label + " (in mV)", "Error (in %)", Mode + ", " + Label + " relative error");

		if (Calibrate)
		{
			var Quad = CGEN_UseQuadraticCorrection();
			var Corr = Quad ? CGEN_GetCorrection2(Name) : CGEN_GetCorrection(Name);

			if (FullScale)
			{
				if (Quad)
					CLSL_CalVfs2(Corr[0], Corr[1], Corr[2]);
				else
					CLSL_CalVfs(Corr[0], Corr[1]);
				CLSL_PrintVfsCal();
			}
			else
			{
				if (Quad)
					CLSL_CalV2(Corr[0], Corr[1], Corr[2]);
				else
					CLSL_CalV(Corr[0], Corr[1]);
				CLSL_PrintVCal();
			}
		}
		else
			scattern(clsl_v_sc, clsl_v_err_sum, Label + " (in mV)", "Error (in %)", Mode + ", " + Label + " summary error");
	}
}

function CLSL_LimitVoltageCurrent(VoltageMax)
{
	clsl_ImaxV = Math.round((VoltageMax - clsl_DUTConst) / clsl_DUTRes);
	if (clsl_ImaxV > clsl_Imax)
		clsl_ImaxV = clsl_Imax;
	else if (clsl_ImaxV < clsl_Imin)
		clsl_ImaxV = clsl_Imin;
}

function CLSL_Collect(CurrentValues, VoltageMode, IterationsCount)
{
	if (clsl_ForceShuntRes)
		clsl_ShuntRes = clsl_ForceShuntRes;
	else
		clsl_ShuntRes = LSLH_LinearIAR ? (dev.r(4) / 1000) : (dev.r(14) / dev.r(15));

	if (LSLH_LinearIAR)
		print("LSL current range set to " + clsl_CurrentRange);

	if (VoltageMode)
	{
		print("Device resistance set to " + clsl_DUTRes + " mOhms");
		print("Maximum current set to " + clsl_ImaxV + " A");
	}
	else
	{
		print("Shunt resistance " + clsl_ShuntRes + " mOhms");
		print("Maximum current set to " + clsl_Imax + " A");
	}
	print("-----------");

	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	if (dev.r(192) == DS_None)
		dev.c(1);
	while (dev.r(192) == DS_BatteryCharge)
		sleep(100);
	if (dev.r(192) != DS_Ready)
	{
		print("Power-up error");
		return 0;
	}

	sleep(500);

	if (VoltageMode)
		CLSL_TekScale(clsl_chMeasureU, (clsl_ImaxV * clsl_DUTRes + clsl_DUTConst) / 1000);
	else
		CLSL_TekScale(clsl_chMeasureI, clsl_Imax * clsl_ShuntRes / 1000);
	sleep(500);

	var E0 = CLSL_ErrE0();

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			var Iset = CurrentValues[j];
			var Vexp = Iset * clsl_DUTRes + clsl_DUTConst;		// mV
			var AvgNum = CLSL_TekAcquire(VoltageMode ? (Vexp < 1500) : (Iset * clsl_ShuntRes / 1000 < 0.3));

			if (clsl_UseRangeTuning)
			{
				if (VoltageMode)
					CLSL_TekScale(clsl_chMeasureU, Vexp / 1000);
				else
					CLSL_TekScale(clsl_chMeasureI, Iset * clsl_ShuntRes / 1000);
			}
			sleep(1000);
			clsl_i_set.push(Iset);

			dev.w(160, 1);
			sl_print = 0;
			sl_rep = 1;
			for (var k = 0; k < AvgNum; k++)
				SL_Sin(Iset);
			sl_print = 1;

			print("Iset,  A: " + Iset);

			var v_read = dev.r(198);
			var i_read = dev.r(206);
			clsl_v.push(v_read);
			clsl_i.push(i_read);

			var v_sc = Math.round(CLSL_Measure(clsl_chMeasureU, 3) * 1000);
			var i_sc = Math.round(CLSL_Measure(clsl_chMeasureI, 3) / (clsl_ShuntRes * 1e-3));
			clsl_v_sc.push(v_sc);
			clsl_i_sc.push(i_sc);

			if (VoltageMode)
			{
				print("V,    mV: " + v_read);
				print("Vtek, mV: " + v_sc);
			}
			else
			{
				print("I,     A: " + i_read);
				print("Itek,  A: " + i_sc);
			}

			var v_err = CLSL_ErrMeasure(v_read, v_sc);
			var i_err = CLSL_ErrMeasure(i_read, i_sc);
			var iset_err = CLSL_ErrSet(i_sc, Iset);

			clsl_v_err.push(v_err.toFixed(2));
			clsl_i_err.push(i_err.toFixed(2));
			clsl_iset_err.push(iset_err.toFixed(2));

			clsl_v_err_sum.push(CLSL_ErrSum(v_err, clsl_EUosc));
			clsl_i_err_sum.push(CLSL_ErrSum(i_err, E0));
			clsl_iset_err_sum.push(CLSL_ErrSum(iset_err, E0));

			sleep(1000);

			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			if (anykey())
				return 0;
		}
	}

	return 1;
}

function CLSL_CalcDUT(Current1, Current2, Scale)
{
	dev.w(162, Scale ? 1 : 0);
	var a = SL_Sin(Current1);
	var b = SL_Sin(Current2);

	clsl_DUTRes = (a.v - b.v) / (a.i - b.i);
	clsl_DUTConst = Math.round(a.v - a.i * clsl_DUTRes / 1000);

	print("clsl_DUTRes:	" + clsl_DUTRes);
	print("clsl_DUTConst:	" + clsl_DUTConst);
}

// Управление: Ig, Ug
//----------------------------------------------------------------------------------
function CLSL_CalibrateIg()
{
	CLSL_RunIg(true);
}

function CLSL_VerifyIg()
{
	CLSL_RunIg(false);
}

function CLSL_RunIg(Calibrate)
{
	if (!CLSL_RequireGateControl())
		return;

	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetIgCal();

	CLSL_InitMeter(clsl_chMeasureI, true);

	if (CLSL_CollectIg(CLSL_GetRange(clsl_IgMin, clsl_IgMax), clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";
		var Range = clsl_IgMin + " ... " + clsl_IgMax + " mA";

		CLSL_SaveIg(Calibrate ? "LSL_Ig" : "LSL_Ig_fixed", Calibrate ? "LSL_IgSet" : "LSL_IgSet_fixed");
		scattern(clsl_IgSc, clsl_IgErr, "Current (in mA)", "Error (in %)", Mode + ", Ig relative error " + Range);
		scattern(clsl_IgSc, clsl_IgSetErr, "Current (in mA)", "Error (in %)", Mode + ", Ig set relative error " + Range);

		if (Calibrate)
		{
			var Corr = CGEN_GetCorrection2("LSL_Ig");
			CLSL_CalIg(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefIg();

			Corr = CGEN_GetCorrection2("LSL_IgSet");
			CLSL_CalIgSet(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefIgSet();
		}
	}
}

function CLSL_CalibrateUg()
{
	CLSL_RunUg(true);
}

function CLSL_VerifyUg()
{
	CLSL_RunUg(false);
}

function CLSL_RunUg(Calibrate)
{
	if (!CLSL_RequireGateControl())
		return;

	CLSL_ResetA();
	if (Calibrate)
		CLSL_ResetUgCal();

	CLSL_InitMeter(clsl_chMeasureU, true);

	if (CLSL_CollectUg(CLSL_GetRange(clsl_UgMin, clsl_UgMax), clsl_Iterations))
	{
		var Mode = Calibrate ? "Calibrate" : "Verify";
		var Range = clsl_UgMin + " ... " + clsl_UgMax + " mV";

		CLSL_SaveUg(Calibrate ? "LSL_Ug" : "LSL_Ug_fixed", Calibrate ? "LSL_UgSet" : "LSL_UgSet_fixed");
		scattern(clsl_UgSc, clsl_UgErr, "Voltage (in mV)", "Error (in %)", Mode + ", Ug relative error " + Range);
		scattern(clsl_UgSc, clsl_UgSetErr, "Voltage (in mV)", "Error (in %)", Mode + ", Ug set relative error " + Range);

		if (Calibrate)
		{
			var Corr = CGEN_GetCorrection2("LSL_Ug");
			CLSL_CalUg(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefUg();

			Corr = CGEN_GetCorrection2("LSL_UgSet");
			CLSL_CalUgSet(Corr[0], Corr[1], Corr[2]);
			CLSL_PrintCoefUgSet();
		}
	}
}

// Collect, линейный блок
//----------------------------------------------------------------------------------
function CLSL_CollectUtm(VoltageValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * VoltageValues.length;
	clsl_CntDone = 1;

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			var AvgNum = CLSL_MeterAcquire(VoltageValues[j] < 1500);

			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			var ItmSet = VoltageValues[j] / clsl_Rload * 1000;
			print("Itmset, A: " + ItmSet);

			CLSL_MeterScale(clsl_chMeasureU, VoltageValues[j] / 1000);
			if (CLSL_IsTek())
				CLSL_TekScale(clsl_chMeasureI, ItmSet * clsl_Rshunt / 1000000);

			if (!CLSL_Pulses(ItmSet, AvgNum))
				return 0;

			// Unit data
			var UtmRead = dev.r(198);
			clsl_Utm.push(UtmRead);
			print("Utmread, mV: " + UtmRead);

			// Scope data
			var UtmSc = (CLSL_MeterRead(clsl_chMeasureU) * 1000).toFixed(CLSL_MeterDigits());
			clsl_UtmSc.push(UtmSc);
			print("Utm" + CLSL_MeterName() + ",  mV: " + UtmSc);

			// Relative error
			var UtmErr = CLSL_ErrMeasure(UtmRead, UtmSc).toFixed(2);
			clsl_UtmErr.push(UtmErr);

			// Summary error
			var UtmErr_sum = CLSL_ErrSum(UtmErr, clsl_EUosc);
			clsl_UtmErr_sum.push(UtmErr_sum);

			print("Utmerr,  %: " + UtmErr);
			print("UtmErr_sum,  %: " + UtmErr_sum);
			print("--------------------");

			// Остывание
			sleep(Math.round(ItmSet * clsl_CoolDownPerA));
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CLSL_CollectItm(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			var Ushunt = CurrentValues[j] * clsl_Rshunt / 1000000;		// V
			var AvgNum = CLSL_MeterAcquire(Ushunt < 0.3);

			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			print("Itmset, A: " + CurrentValues[j]);
			CLSL_MeterScale(clsl_chMeasureI, Ushunt);

			if (!CLSL_Pulses(CurrentValues[j], AvgNum))
				return 0;

			// Unit data
			var ItmRead = dev.r(206) + dev.r(205) / 10;
			clsl_Itm.push(ItmRead);
			print("Itmread, A: " + ItmRead);

			// Scope data
			var ItmSc = (CLSL_MeterRead(clsl_chMeasureI) / clsl_Rshunt * 1000000).toFixed(CLSL_MeterDigits());
			clsl_ItmSc.push(ItmSc);
			print("Itm" + CLSL_MeterName() + ", A: " + ItmSc);

			// Relative error
			var ItmErr = CLSL_ErrMeasure(ItmRead, ItmSc).toFixed(2);
			clsl_ItmErr.push(ItmErr);
			print("Itmerr, %: " + ItmErr);
			print("--------------------");

			if (anykey()) return 0;
		}
	}

	return 1;
}

function CLSL_CollectIset(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	var E0 = CLSL_ErrE0();

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			var Ushunt = CurrentValues[j] * clsl_Rshunt / 1000000;		// V
			var AvgNum = CLSL_MeterAcquire(Ushunt < 0.3);

			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			CLSL_MeterScale(clsl_chMeasureI, Ushunt);

			if (!CLSL_Pulses(CurrentValues[j], AvgNum))
				return 0;

			// Unit data
			var Iset = CurrentValues[j];
			clsl_Iset.push(Iset);
			print("Iset, A: " + Iset);

			// Scope data
			var IsetSc = (CLSL_MeterRead(clsl_chMeasureI) / clsl_Rshunt * 1000000).toFixed(CLSL_MeterDigits());
			clsl_IsetSc.push(IsetSc);
			print("ItmSet" + CLSL_MeterName() + ", A: " + IsetSc);

			// Relative error
			var IsetErr = CLSL_ErrSet(IsetSc, Iset).toFixed(2);
			clsl_IsetErr.push(IsetErr);

			// Summary error
			var IsetErr_sum = CLSL_ErrSum(IsetErr, E0);
			clsl_IsetErr_sum.push(IsetErr_sum);

			print("Iseterr, %: " + IsetErr);
			print("Iseterr_sum, %: " + IsetErr_sum);
			print("--------------------");

			if (anykey()) return 0;
		}
	}

	return 1;
}

// Ток управления задаётся через GateCurrent, после прохода прежнее значение возвращается
function CLSL_CollectIg(CurrentValues, IterationsCount)
{
	var GateCurrentTemp = GateCurrent;
	try
	{
		return CLSL_CollectIgLoop(CurrentValues, IterationsCount);
	}
	finally
	{
		GateCurrent = GateCurrentTemp;
	}
}

function CLSL_CollectIgLoop(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			var Ushunt = CurrentValues[j] * clsl_GateRshunt / 1000000;	// V
			var AvgNum = CLSL_MeterAcquire(Ushunt < 0.3);

			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			CLSL_MeterScale(clsl_chMeasureI, Ushunt);

			GateCurrent = CurrentValues[j];
			if (!CLSL_Pulses(300, AvgNum))
				return 0;

			// Unit data
			var IgSet = CurrentValues[j];
			clsl_IgSet.push(IgSet);
			print("IgSet, mA: " + IgSet);

			var Ig = dev.r(203);
			clsl_Ig.push(Ig);
			print("Ig, mA: " + Ig);

			// Scope data
			var IgSc = (CLSL_MeterRead(clsl_chMeasureI) / clsl_GateRshunt * 1000000).toFixed(CLSL_MeterDigits());
			clsl_IgSc.push(IgSc);
			print("Ig" + CLSL_MeterName() + ", mA: " + IgSc);

			// Relative error
			var IgSetErr = CLSL_ErrSet(IgSc, IgSet).toFixed(2);
			clsl_IgSetErr.push(IgSetErr);
			print("IgSetErr, %: " + IgSetErr);

			var IgErr = CLSL_ErrMeasure(Ig, IgSc).toFixed(2);
			clsl_IgErr.push(IgErr);
			print("IgErr, %: " + IgErr);
			print("--------------------");

			if (anykey()) return 0;
		}
	}

	return 1;
}

// Напряжение управления задаётся через GateVoltage, после прохода прежнее значение возвращается
function CLSL_CollectUg(VoltageValues, IterationsCount)
{
	var GateVoltageTemp = GateVoltage;
	try
	{
		return CLSL_CollectUgLoop(VoltageValues, IterationsCount);
	}
	finally
	{
		GateVoltage = GateVoltageTemp;
	}
}

function CLSL_CollectUgLoop(VoltageValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * VoltageValues.length;
	clsl_CntDone = 1;

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			var AvgNum = CLSL_MeterAcquire(VoltageValues[j] < 1500);

			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			CLSL_MeterScale(clsl_chMeasureU, VoltageValues[j] / 1000);

			GateVoltage = VoltageValues[j];
			if (!CLSL_Pulses(300, AvgNum))
				return 0;

			// Unit data
			var UgSet = VoltageValues[j];
			clsl_UgSet.push(UgSet);
			print("UgSet, mV: " + UgSet);

			var Ug = dev.r(202);
			clsl_Ug.push(Ug);
			print("Ug, mV: " + Ug);

			// Scope data
			var UgSc = (CLSL_MeterRead(clsl_chMeasureU) * 1000).toFixed(CLSL_MeterDigits());
			clsl_UgSc.push(UgSc);
			print("Ug" + CLSL_MeterName() + ",  mV: " + UgSc);

			// Relative error
			var UgSetErr = CLSL_ErrSet(UgSc, UgSet).toFixed(2);
			clsl_UgSetErr.push(UgSetErr);
			print("UgSetErr,  %: " + UgSetErr);

			var UgErr = CLSL_ErrMeasure(Ug, UgSc).toFixed(2);
			clsl_UgErr.push(UgErr);
			print("UgErr,  %: " + UgErr);
			print("--------------------");

			if (anykey()) return 0;
		}
	}

	return 1;
}

// Tektronix
//----------------------------------------------------------------------------------
function CLSL_TekScale(Channel, Value)
{
	if (CLSL_UseCursor())
	{
		TEK_ChannelScale(Channel, Value);
		return;
	}

	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
	sleep(1000)
}

function CLSL_TekInit(Channel)
{
	TEK_Horizontal("1e-3", "0");
	TEK_Send("trigger:main:edge:slope fall");
	TEK_ChannelInit(Channel, "1", "2");
	CLSL_TekMeasurement(Channel);
}

function CLSL_GateTekInit(Channel)
{
	TEK_Horizontal("25e-6", "5e-6");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Send("horizontal:position " + 0.0002);
	TEK_ChannelInit(Channel, "1", "2");
	CLSL_TekMeasurement(Channel);
}

function CLSL_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send(CLSL_UseCursor() ? "cursor:vbars:position1 -5e-3" : "cursor:vbars:position1 0");
	TEK_Send("cursor:vbars:position2 0");
}

function CLSL_Measure(Channel, Resolution)
{
	if (CLSL_UseCursor())
	{
		TEK_Send("cursor:select:source ch" + Channel);
		sleep(500);

		var f = TEK_Exec("cursor:vbars:hpos2?");
		if (Math.abs(f) > 2e+4)
			f = 0;
		if (typeof Resolution === "undefined")
			Resolution = 3;
		return parseFloat(f).toFixed(Resolution);
	}

	sleep(1000);
	return TEK_Measure(Channel);
}

function CLSL_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type maximum");
}

// Reset Arrays
//----------------------------------------------------------------------------------
function CLSL_ResetA()
{
	// Линейный блок: показания блока, эталон, относительная и суммарная погрешность
	clsl_Utm = [];		clsl_UtmSc = [];	clsl_UtmErr = [];	clsl_UtmErr_sum = [];
	clsl_Itm = [];		clsl_ItmSc = [];	clsl_ItmErr = [];
	clsl_Iset = [];		clsl_IsetSc = [];	clsl_IsetErr = [];	clsl_IsetErr_sum = [];
	clsl_Ig = [];		clsl_IgSc = [];		clsl_IgErr = [];
	clsl_IgSet = [];						clsl_IgSetErr = [];
	clsl_Ug = [];		clsl_UgSc = [];		clsl_UgErr = [];
	clsl_UgSet = [];						clsl_UgSetErr = [];

	// ШИМ и линейный IAR
	clsl_v = [];		clsl_v_sc = [];		clsl_v_err = [];	clsl_v_err_sum = [];
	clsl_i = [];		clsl_i_sc = [];		clsl_i_err = [];	clsl_i_err_sum = [];
	clsl_i_set = [];						clsl_iset_err = [];	clsl_iset_err_sum = [];
}

// Save
//----------------------------------------------------------------------------------
function CLSL_SaveUtm(NameUtm)
{
	CGEN_SaveArrays2(NameUtm, clsl_Utm, clsl_UtmSc, clsl_UtmErr, clsl_UtmErr_sum);
}

function CLSL_SaveItm(NameItm)
{
	CGEN_SaveArrays(NameItm, clsl_Itm, clsl_ItmSc, clsl_ItmErr);
}

function CLSL_SaveIset(NameIset)
{
	CGEN_SaveArrays2(NameIset, clsl_IsetSc, clsl_Iset, clsl_IsetErr, clsl_IsetErr_sum);
}

function CLSL_SaveIg(NameIg, NameIgSet)
{
	CGEN_SaveArrays(NameIg, clsl_Ig, clsl_IgSc, clsl_IgErr);
	CGEN_SaveArrays(NameIgSet, clsl_IgSc, clsl_IgSet, clsl_IgSetErr);
}

function CLSL_SaveUg(NameUg, NameUgSet)
{
	CGEN_SaveArrays(NameUg, clsl_Ug, clsl_UgSc, clsl_UgErr);
	CGEN_SaveArrays(NameUgSet, clsl_UgSc, clsl_UgSet, clsl_UgSetErr);
}

function CLSL_SaveV(NameV)
{
	CGEN_SaveArrays2(NameV, clsl_v, clsl_v_sc, clsl_v_err, clsl_v_err_sum);
}

function CLSL_SaveI(NameI)
{
	CGEN_SaveArrays2(NameI, clsl_i, clsl_i_sc, clsl_i_err, clsl_i_err_sum);
}

function CLSL_SaveIsetPwm(NameI)
{
	CGEN_SaveArrays2(NameI, clsl_i_sc, clsl_i_set, clsl_iset_err, clsl_iset_err_sum);
}

// ADC, линейный блок
//----------------------------------------------------------------------------------
// 0 — нижний диапазон, регистры 2 и 3; 1 — верхний, регистры 7 и 8
function CLSL_ItmAdcReg()
{
	if (clsl_CurrentRange == 0)
		return {Offset : 2, K : 3};
	if (clsl_CurrentRange == 1)
		return {Offset : 7, K : 8};

	print("Incorrect I range.");
	return null;
}

function CLSL_ReadCoefADC(reg)
{
	return {Offset : dev.rs(reg.Offset), K : dev.r(reg.K) / 1000};
}

// u = I * Rshunt_mOhm * ADC_RESOLUTION / ADC_REF_MV = (ADC + Offset) * K
function CLSL_AdcCodeValues(currentArray)
{
	var code = [];
	var scale = (dev.r(0) / 1000) * clsl_AdcResolution / clsl_AdcRefMv;

	for (var i = 0; i < currentArray.length; i++)
		code.push(parseFloat(currentArray[i]) * scale);

	return code;
}

function CLSL_SetCoefADC(reg, B, K)
{
	if (Math.round(K * 1000) == 0)
	{
		print("ADC K is 0. Coefficients were not written");
		return;
	}

	dev.w(reg.K, Math.round(K * 1000));
	dev.ws(reg.Offset, Math.round(B / K));
}

// Регистры грубой подстройки диапазона и его полинома. Signed — чтение через dev.rs.
function CLSL_ItmAdcRegList(reg)
{
	var p = (clsl_CurrentRange == 0) ? {P0 : 4, P1 : 5, P2 : 6} : {P0 : 9, P1 : 10, P2 : 11};

	return [
		{Name : "Offset",		Reg : reg.Offset,	Signed : true},
		{Name : "K x1000",		Reg : reg.K,		Signed : false},
		{Name : "P0",			Reg : p.P0,			Signed : true},
		{Name : "P1 x1000",		Reg : p.P1,			Signed : false},
		{Name : "P2 x1e6",		Reg : p.P2,			Signed : true}
	];
}

function CLSL_ReadRegList(RegList)
{
	var values = [];
	for (var i = 0; i < RegList.length; i++)
		values.push(RegList[i].Signed ? dev.rs(RegList[i].Reg) : dev.r(RegList[i].Reg));

	return values;
}

// Таблица «было → стало» по списку регистров
function CLSL_PrintRegChange(Title, RegList, Before)
{
	var after = CLSL_ReadRegList(RegList);

	print("====================");
	print(Title);
	print("Регистр		Было	Стало");
	for (var i = 0; i < RegList.length; i++)
		print(RegList[i].Name + " (" + RegList[i].Reg + ")	" + Before[i] + "	" + after[i]
			+ (Before[i] != after[i] ? "	*" : ""));
	print("Rshunt, uOhm (0): " + dev.r(0) + ", не меняется");
	print("====================");
}

function CLSL_PrintCoefADC()
{
	var reg = CLSL_ItmAdcReg();
	if (!reg)
		return;

	var coef = CLSL_ReadCoefADC(reg);
	print("Itm " + clsl_CurrentRange + " Offset (reg " + reg.Offset + "): " + coef.Offset);
	print("Itm " + clsl_CurrentRange + " K x1000 (reg " + reg.K + "): " + dev.r(reg.K));
	print("Itm " + clsl_CurrentRange + " K: " + coef.K);
	print("Rshunt, uOhm (reg 0): " + dev.r(0));
}

// Cal
//----------------------------------------------------------------------------------
function CLSL_CalUtm(P2, P1, P0)
{
	dev.ws(16, Math.round(P2 * 1e6));
	dev.w(15, Math.round(P1 * 1000));
	dev.ws(14, Math.round(P0));
}

function CLSL_CalItm(P2, P1, P0)
{
	switch (clsl_CurrentRange)
	{
		case 0:
			dev.ws(6, Math.round(P2 * 1e6));
			dev.w(5, Math.round(P1 * 1000));
			dev.ws(4, Math.round(P0));
			break;
		case 1:
			dev.ws(11, Math.round(P2 * 1e6));
			dev.w(10, Math.round(P1 * 1000));
			dev.ws(9, Math.round(P0));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_CalIset(P2, P1, P0)
{
	if (LSLH_PWM)
	{
		dev.ws(77, Math.round(P2 * 1e6));
		dev.w(78, Math.round(P1 * 1000));
		dev.ws(79, Math.round(P0));
	}
	else if (LSLH_LinearIAR)
	{
		dev.ws(11, Math.round(P2 * 1e6));
		dev.w(12, Math.round(P1 * 1000));
		dev.ws(13, Math.round(P0 * 10));
	}
	else
	{
		dev.ws(43, Math.round(P2 * 1e6));
		dev.w(42, Math.round(P1 * 1000));
		dev.ws(41, Math.round(P0));
	}
}

function CLSL_CalIg(P2, P1, P0)
{
	dev.ws(21, Math.round(P2 * 1e6));
	dev.w(20, Math.round(P1 * 1000));
	dev.ws(19, Math.round(P0));
}

function CLSL_CalIgSet(P2, P1, P0)
{
	dev.ws(59, Math.round(P2 * 1e6));
	dev.w(58, Math.round(P1 * 1000));
	dev.ws(57, Math.round(P0));
}

function CLSL_CalUg(P2, P1, P0)
{
	dev.ws(26, Math.round(P2 * 1e6));
	dev.w(25, Math.round(P1 * 1000));
	dev.ws(24, Math.round(P0));
}

function CLSL_CalUgSet(P2, P1, P0)
{
	dev.ws(54, Math.round(P2 * 1e6));
	dev.w(53, Math.round(P1 * 1000));
	dev.ws(52, Math.round(P0));
}

function CLSL_CalV(K, Offset)
{
	dev.w(22, Math.round(K * 1000));
	dev.w(23, 1000);
	dev.ws(32, Math.round(Offset));
}

function CLSL_CalV2(P2, P1, P0)
{
	if (LSLH_LinearIAR)
	{
		dev.ws(14, Math.round(P2 * 1e6));
		dev.w(15, Math.round(P1 * 1000));
		dev.ws(16, Math.round(P0 * 10));
	}
	else
	{
		dev.ws(22, Math.round(P2 * 1e6));
		dev.w(23, Math.round(P1 * 1000));
		dev.ws(32, Math.round(P0));
	}
}

function CLSL_CalVfs(K, Offset)
{
	dev.w(39, Math.round(K * 1000));
	dev.w(40, 1000);
	dev.ws(55, Math.round(Offset));
}

function CLSL_CalVfs2(P2, P1, P0)
{
	dev.ws(39, Math.round(P2 * 1e6));
	dev.w(40, Math.round(P1 * 1000));
	dev.ws(55, Math.round(P0));
}

function CLSL_CalI(K, Offset)
{
	dev.w(18, Math.round(K * 1000));
	dev.w(19, 1000);
	dev.ws(38, Math.round(Offset));
}

function CLSL_CalI2(P2, P1, P0)
{
	if (LSLH_LinearIAR)
	{
		dev.ws(17 + clsl_CurrentRange * 3, Math.round(P2 * 1e6));
		dev.w(18 + clsl_CurrentRange * 3, Math.round(P1 * 1000));
		dev.ws(19 + clsl_CurrentRange * 3, Math.round(P0 * 10));
	}
	else
	{
		dev.ws(18, Math.round(P2 * 1e6));
		dev.w(19, Math.round(P1 * 1000));
		dev.ws(38, Math.round(P0));
	}
}

// Print
//----------------------------------------------------------------------------------
function CLSL_PrintCoefUtm()
{
	print("Utm P2 x1e6	: " + dev.rs(16));
	print("Utm P1 x1000	: " + dev.rs(15));
	print("Utm P0		: " + dev.rs(14));
}

function CLSL_PrintCoefItm()
{
	switch (clsl_CurrentRange)
	{
		case 0:
			print("Itm 0 P2 x1e6	: " + dev.rs(6));
			print("Itm 0 P1 x1000	: " + dev.rs(5));
			print("Itm 0 P0			: " + dev.rs(4));
			break;
		case 1:
			print("Itm 1 P2 x1e6	: " + dev.rs(11));
			print("Itm 1 P1 x1000	: " + dev.rs(10));
			print("Itm 1 P0			: " + dev.rs(9));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_PrintCoefIset()
{
	if (LSLH_PWM)
	{
		print("Iset P2 x1e6:	" + dev.rs(77));
		print("Iset P1 x1000:	" + dev.r(78));
		print("Iset P0:	" + dev.rs(79));
	}
	else if (LSLH_LinearIAR)
	{
		print("Iset P2 x1e6:	" + dev.rs(11));
		print("Iset P1 x1000:	" + dev.r(12));
		print("Iset P0:	" + (dev.rs(13) / 10));
	}
	else
	{
		print("ItmSet P2 x1e6	: " + dev.rs(43));
		print("ItmSet P1 x1000	: " + dev.rs(42));
		print("ItmSet P0		: " + dev.rs(41));
	}
}

function CLSL_PrintCoefIg()
{
	print("Ig P2 x1e6	: " + dev.rs(21));
	print("Ig P1 x1000	: " + dev.rs(20));
	print("Ig P0		: " + dev.rs(19));
}

function CLSL_PrintCoefIgSet()
{
	print("Ig Set P2 x1e6	: " + dev.rs(59));
	print("Ig Set P1 x1000	: " + dev.rs(58));
	print("Ig Set P0		: " + dev.rs(57));
}

function CLSL_PrintCoefUg()
{
	print("Ug P2 x1e6	: " + dev.rs(26));
	print("Ug P1 x1000	: " + dev.rs(25));
	print("Ug P0		: " + dev.rs(24));
}

function CLSL_PrintCoefUgSet()
{
	print("Ug Set P2 x1e6	: " + dev.rs(54));
	print("Ug Set P1 x1000	: " + dev.rs(53));
	print("Ug Set P0		: " + dev.rs(52));
}

function CLSL_PrintICal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		if (LSLH_LinearIAR)
		{
			print("Range " + clsl_CurrentRange + " correction");
			print("I P2 x1e6:	" + dev.rs(17 + clsl_CurrentRange * 3));
			print("I P1 x1000:	" + dev.r(18 + clsl_CurrentRange * 3));
			print("I P0:		" + (dev.rs(19 + clsl_CurrentRange * 3) / 10));
		}
		else
		{
			print("I P2 x1e6:	" + dev.rs(18));
			print("I P1 x1000:	" + dev.r(19));
			print("I P0:		" + dev.rs(38));
		}
	}
	else
	{
		print("I K:		" + (dev.r(18) / dev.r(19)));
		print("I Offset: 	" + dev.rs(38));
	}
}

function CLSL_PrintVCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		if (LSLH_LinearIAR)
		{
			print("V P2 x1e6:	" + dev.rs(14));
			print("V P1 x1000:	" + dev.r(15));
			print("V P0:		" + (dev.rs(16) / 10));
		}
		else
		{
			print("V P2 x1e6:	" + dev.rs(22));
			print("V P1 x1000:	" + dev.r(23));
			print("V P0:		" + dev.rs(32));
		}
	}
	else
	{
		print("V K:		" + (dev.r(22) / dev.r(23)));
		print("V Offset: 	" + dev.rs(32));
	}
}

function CLSL_PrintVfsCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("Vfs P2 x1e6:	" + dev.rs(39));
		print("Vfs P1 x1000:	" + dev.r(40));
		print("Vfs P0:		" + dev.rs(55));
	}
	else
	{
		print("Vfs K:		" + (dev.r(39) / dev.r(40)));
		print("Vfs Offset:	" + dev.rs(55));
	}
}

// Reset
//----------------------------------------------------------------------------------
function CLSL_ResetUtmCal()
{
	CLSL_CalUtm(0, 1, 0);
}

function CLSL_ResetItmCal()
{
	CLSL_CalItm(0, 1, 0);
}

function CLSL_ResetIsetCal()
{
	CLSL_CalIset(0, 1, 0);
}

function CLSL_ResetIgCal()
{
	CLSL_CalIg(0, 1, 0);
	CLSL_CalIgSet(0, 1, 0);
}

function CLSL_ResetUgCal()
{
	CLSL_CalUg(0, 1, 0);
	CLSL_CalUgSet(0, 1, 0);
}

function CLSL_ResetICal()
{
	if (CGEN_UseQuadraticCorrection())
		CLSL_CalI2(0, 1, 0);
	else
		CLSL_CalI(1, 0);
}

function CLSL_ResetVCal()
{
	if (CGEN_UseQuadraticCorrection())
		CLSL_CalV2(0, 1, 0);
	else
		CLSL_CalV(1, 0);
}

function CLSL_ResetVfsCal()
{
	if (CGEN_UseQuadraticCorrection())
		CLSL_CalVfs2(0, 1, 0);
	else
		CLSL_CalVfs(1, 0);
}

// HMIU calibration
//----------------------------------------------------------------------------------
function Measuring_Filter()
{
	allowedMeasuring = "TPS2000";
	return allowedMeasuring;
}

function CSL_Initialize()
{
	clsl_chMeasureI = 1;
	clsl_chMeasureU = 2;
	clsl_chSync = 3;
	LSLH_CheckVersion();
	CLSL_SyncInit();
}

function CSL_VerifyItm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	clsl_CurrentRange = rangeId;
	clsl_ItmMin = rangeMin;
	clsl_ItmMax = rangeMax;
	clsl_Points = count;
	clsl_Iterations = verificationCount;
	clsl_Rshunt = resistance;
	CSL_Initialize();
	CLSL_VerifyIset();
	return [clsl_IsetSc, clsl_Iset, clsl_IsetSc, clsl_IsetErr];
}

function CSL_VerifyVtm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	clsl_CurrentRange = rangeId;
	clsl_UtmMin = rangeMin;
	clsl_UtmMax = rangeMax;
	clsl_Points = count;
	clsl_Iterations = verificationCount;
	clsl_Rload = resistance;
	CSL_Initialize();
	CLSL_VerifyUtm();
	return [clsl_UtmSc, clsl_Utm, clsl_UtmSc, clsl_UtmErr];
}
