include("SiC_GetData.js")

sic_calc_rf_max_zone = 50;

function SiC_CALC_Delay(Curves)
{
	var _Vge = Curves.Vge;
	var _Ice = Curves.Ice;
	var TimeStep = Curves.TimeStep;
	
	// check input data
	if (_Vge.length != _Ice.length)
		print("Delay calc: arrays of different lengths.")
	
	// get curves pivot points
	var Vge_pivot = SiC_CALC_SignalRiseFall(_Vge, TimeStep);
	var Ice_pivot = SiC_CALC_SignalRiseFall(_Ice, TimeStep);
	
	var delay = SiC_CALC_OnMode(Curves) ? (Ice_pivot.t_min - Vge_pivot.t_min) : (Ice_pivot.t_max - Vge_pivot.t_max);
	
	return (delay * TimeStep * 1e9);
}

function SiC_CALC_VI_RiseFall(Curves, IsDiode)
{
	var V_points = SiC_CALC_SignalRiseFall(IsDiode ? SiC_GD_InvertData(Curves.Vce) : Curves.Vce, Curves.TimeStep);
	var I_points = SiC_CALC_SignalRiseFall(Curves.Ice, Curves.TimeStep);
	
	return {V_points : V_points, I_points : I_points};
}

function SiC_CALC_SignalRiseFall(Signal, TimeStep, LowPoint)
{
	// find plate max value
	var S_amp = 0;
	var rise_mode = (Signal[0] < Signal[Signal.length - 1]) ? 1 : 0;
	
	// find amplitude
	for (var i = 0; i < sic_calc_rf_max_zone; ++i)
		S_amp += Signal[rise_mode ? (Signal.length - 1 - i) : i];
	S_amp /= sic_calc_rf_max_zone;
	
	// find rise/fall zone
	var t_min = 0;
	var t_max = 0;
	
	if (typeof LowPoint === 'undefined')
		LowPoint = 0.1;
	
	for (var i = 0; i < Signal.length; ++i)
	{
		if (Signal[rise_mode ? i : (Signal.length - 1 - i)] > (S_amp * LowPoint) && t_min == 0)
			t_min = (rise_mode ? i : (Signal.length - 1 - i));
		
		if (Signal[rise_mode ? i : (Signal.length - 1 - i)] > (S_amp * 0.9) && t_max == 0)
			t_max = (rise_mode ? i : (Signal.length - 1 - i));
	}
	
	// calculate rise/fall
	var t_rf = Math.abs((t_max - t_min) * TimeStep);
	t_rf = t_rf * 1e9;
	var S_rf = Math.abs((Signal[t_max] - Signal[t_min]) / t_rf);
	S_rf = S_rf * 1e3;
	var S_max = SiC_GD_MAX(Signal).Value;
	
	return {S_max : S_max, S_amp : S_amp, S_rf : S_rf, t_rf : t_rf, t_min : t_min, t_max : t_max};
}

function SiC_CALC_Recovery(Curves, IsDiode)
{
	var Current = IsDiode ? SiC_GD_InvertData(Curves.Ice) : Curves.Ice;
	var Voltage = IsDiode ? SiC_GD_InvertData(Curves.Vce) : Curves.Vce;
	var TimeStep = Curves.TimeStep;
	
	// line equation to find Ir0 point
	var LineI = SiC_CALC_RecoveryGetXY(Current, IsDiode);
	
	var I_PointMin = SiC_GD_MIN(Current);
	var I_PointMax = SiC_GD_MAX(Current);
	
	// find Ir0
	var Ir0 = 0, tr0 = 0;
	for (var i = I_PointMin.Index; i < I_PointMax.Index; ++i)
	{
		if (Current[i] > (i * LineI.k + LineI.b))
		{
			Ir0 = Current[i];
			tr0 = i;
			break;
		}
	}
	
	// adjust current data to find reverse recovery charge
	var current_trim = [];
	for (var i = tr0; i < Current.length; ++i)
		current_trim[i - tr0] = Current[i] - (i * LineI.k + LineI.b);
	
	// find Irrm
	var Irrm_Point = SiC_GD_MAX(current_trim);
	var Irrm = Irrm_Point.Value;
	
	// find aux curve points
	var AuxPoint090 = SiC_CALC_FindAuxPoint(current_trim, Irrm_Point.Index, Irrm * 0.9);
	var AuxPoint025 = SiC_CALC_FindAuxPoint(current_trim, Irrm_Point.Index, Irrm * 0.25);
	var AuxPoint002 = SiC_CALC_FindAuxPoint(current_trim, Irrm_Point.Index, Irrm * 0.02);
	
	var k_r = (AuxPoint090.Y - AuxPoint025.Y) / (AuxPoint090.X - AuxPoint025.X);
	var b_r = AuxPoint090.Y - k_r * AuxPoint090.X;
	
	// find trr
	var trr_index = Math.round(-b_r / k_r);
	var trr = -b_r / k_r * TimeStep * 1e9;
	var Qrr = SiC_CALC_Integrate(current_trim, TimeStep, 0, trr_index - 1) * 1e6;
	
	// calculate recovery energy
	var Power = [];
	for (var i = tr0; i < (tr0 + AuxPoint002.X); ++i)
		Power[i - tr0] = Voltage[i] * (Current[i] - (i * LineI.k + LineI.b));
	var Energy = SiC_CALC_Integrate(Power, TimeStep, 0, Power.length - 1) * 1e3;
	
	return {trr : trr, Irrm : Irrm, Qrr : Qrr, Energy : Energy};
}

function SiC_CALC_RecoveryGetXY(Data, IsDiode)
{
	var MaxPoint = SiC_GD_MAX(Data);
	
	var StartIndex = MaxPoint.Index + Math.round((Data.length - MaxPoint.Index) * 0.5);
	var EndIndex = Data.length - 1;
	
	var k, b;
	if (IsDiode)
	{
		k = (Data[StartIndex] - Data[EndIndex]) / (StartIndex - EndIndex);
		b = Data[StartIndex] - k * StartIndex;
	}
	else
	{
		k = 0;
		b = SiC_GD_AvgData(Data, StartIndex, EndIndex);
	}
	
	return {k : k, b : b}
}

function SiC_CALC_Energy(Curves)
{
	var _Vge = Curves.Vge;
	var _Vce = Curves.Vce;
	var _Ice = Curves.Ice;
	var TimeStep = Curves.TimeStep;
	
	// check input data
	if (_Vce.length != _Ice.length)
		print("Energy calc: arrays of different lengths.")
	
	// determine calculation mode
	var on_mode = SiC_CALC_OnMode(Curves) ? 1 : 0;
	
	// get curves pivot points
	var Vge_pivot = SiC_CALC_SignalRiseFall(_Vge, TimeStep);
	var Vce_pivot = SiC_CALC_SignalRiseFall(_Vce, TimeStep, 0.02);
	var Ice_pivot = SiC_CALC_SignalRiseFall(_Ice, TimeStep, 0.02);
	
	// determine time limits
	var start_time = on_mode ? Vge_pivot.t_min : Vge_pivot.t_max;
	var stop_time  = on_mode ? Vce_pivot.t_min : Ice_pivot.t_min;
	
	// calculate power
	var Power = [];
	for (var i = start_time; i < stop_time; ++i)
		Power[i - start_time] = _Vce[i] * _Ice[i];
	
	var Energy = SiC_CALC_Integrate(Power, TimeStep, 0, Power.length - 1) * 1e3;
	
	return {Power : Power, Energy : Energy};
}

function SiC_CALC_OnMode(Curves)
{
	return (Curves.Vce[0] > Curves.Vce[Curves.Vce.length - 1]);
}

function SiC_CALC_Integrate(Data, TimeStep, StartIndex, EndIndex)
{
	var Result = 0;
	
	for (var i = StartIndex; i <= EndIndex; ++i)
		Result += Data[i];
	Result -= 0.5 * (Data[StartIndex] + Data[EndIndex]);
	
	return Result * TimeStep;
}

function SiC_CALC_FindAuxPoint(Data, StartIndex, Threshold)
{
	var x, y;
	for (var i = StartIndex; i < Data.length; ++i)
	{
		if (Data[i] <= Threshold)
		{
			y = Data[i];
			x = i;
			break;
		}
	}
	
	return {X : x, Y : y};
}

function SiC_CALC_IsDiode(Curves)
{
	return (SiC_GD_AvgData(Curves.Vce, 0, Curves.Vce.length - 1) < 0);
}

function SiC_CALC_dVdt(Data, LowLevel10, HighLevel90)
{
	var res = []
	var dVdt = 0
	var DataLimit = []
	var TimeStep = SiC_GD_GetTimeScale() / 250
	var MaxLevel = Data[0]
	var LowPercent = 0
	var HighPercent = 0

	var sumx = 0;
	var sumy = 0;
	var sumx2 = 0;
	var sumxy = 0;
	var k = 0;
	var b = 0;

	// поиск максимального значения для выбора границ
	for (var i = 0; i < Data.length; ++i)
		if (Data[i] > MaxLevel)
			MaxLevel = Data[i]

	var LowValue = MaxLevel * LowLevel10 / 100
	var HighValue = MaxLevel * HighLevel90 / 100

	// исключаем точки которые менее или более указанных границ
	for (var i = 0; i < Data.length - 1; ++i)
		if(Data[i] > LowValue && Data[i] < HighValue)
			DataLimit.push(Data[i])
	//plot(DataLimit, 1, 1)

	// берем производную из массива
	for (var i = 0; i < DataLimit.length - 1; ++i)
		res.push(DataLimit[i+1]-DataLimit[i])
	//plot(res, 1, 1)

	// расчет медианного коэффициента наклона
	res.sort(function(a, b){ return a - b; })
	var isort = res.length / 2
	maxk = (isort % 1 == 0 ? (res[isort - 1] + res[isort]) / 2 : res[Math.floor(isort)])

	dVdt = maxk / TimeStep * 1e-6;
	p("dVdt mediana("+ LowLevel10 +"-"+ HighLevel90 +") = " + (dVdt).toFixed(2) + " V/us")

	// рассчет апроксимационной прямой
	for (var i = 0; i < DataLimit.length; i++)
	{
		sumx += i;
		sumy += DataLimit[i];
		sumx2 += i * i;
		sumxy += i * DataLimit[i];
	}

	k = (DataLimit.length * sumxy - (sumx * sumy)) / (DataLimit.length * sumx2 - sumx * sumx);
	b = (sumy - k * sumx) / DataLimit.length;

	dVdt = k / TimeStep * 1e-6;
	p("dVdt approx("+ LowLevel10 +"-"+ HighLevel90 +") = " + (dVdt).toFixed(2) + " V/us");

	return dVdt;
}