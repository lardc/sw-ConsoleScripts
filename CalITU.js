include('TestITU.js')
include('CalGeneral.js')
// Совместимость: 0 - версия 1.0.0, 1 - версия 1.0
compatibility = 0

// Доступные границы формирования напряжения (в В)
citu_Vmin = 1000
citu_Vmax = 10500

// Выбранный диапазон тока: 1 - старший, 2 - средний, 3 - младший
citu_IRange = 3

// Выбор канала тока: 0 - 1 канал, 1 - 2 канал, 2 - 3 канал, 3 - 4 канал
Channel = 3

// Время считывания результата от готовности напряжения (в сек)
citu_ProbeTime = 3

// Сопротивление нагрузки для калибровки/верификации тока (в Ом)
//citu_LoadRes = 93880	// старший
//citu_LoadRes = 10e5		// средний
citu_LoadRes = 9.909e6	// младший

// Хранилища результатов
// Блока
citu_v = []
citu_i = []

// Эталонные
citu_v_ref = []
citu_i_ref = []

// Погрешность
citu_v_err = []
citu_i_err = []

citu_VoltageMode = true
citu_Iterations = 3
citu_RangeSteps = 10

function CITU_VerifyV()
{
	CITU_Voltage(false)
}

function CITU_CalibrateV()
{
	CITU_Voltage(true)
}

function CITU_Voltage(Calibrate)
{
	citu_VoltageMode = true
	var VStep = (citu_Vmax - citu_Vmin) / (citu_RangeSteps - 1)
	var VoltageValues = CGEN_GetRange(citu_Vmin, citu_Vmax, VStep)
	
	if(Calibrate)
		CITU_CalV(0, 1, 0)
	
	if(CITU_Collect(VoltageValues, 10, citu_Iterations))
	{
		CGEN_SaveArrays(Calibrate ? 'itu_v' : 'itu_v_fixed', citu_v, citu_v_ref, citu_v_err)
		scattern(citu_v_ref, citu_v_err, 'Voltage (in V)', 'Error (in %)', 'Voltage relative error ' + citu_Vmin + '...' + citu_Vmax + ' V')
		
		if(Calibrate)
		{
			var corr = CGEN_GetCorrection2('itu_v')
			CITU_CalV(corr[0], corr[1], corr[2])
			CITU_PrintCalV()
		}
	}
}

function CITU_VerifyI()
{
	CITU_Current(false)
}

function CITU_CalibrateI()
{
	CITU_Current(true)
}

function CITU_Current(Calibrate)
{
	citu_VoltageMode = false
	var CurrentParams = CITU_GetIRangeParameters()
	
	var Vmax = citu_LoadRes * CurrentParams.Limit / 1000
	if(Vmax < citu_Vmin)
	{
		p('R load is too low')
		return
	}
	
	Vmax = (Vmax > citu_Vmax) ? citu_Vmax : Vmax
	var VStep = (Vmax - citu_Vmin) / (citu_RangeSteps - 1)
	var VoltageValues = CGEN_GetRange(citu_Vmin, Vmax, VStep)
	
	if(Calibrate)
		CITU_CalI(Channel, 0, 1, 0)
	
	if(CITU_Collect(VoltageValues, CurrentParams.Limit, citu_Iterations))
	{
		CGEN_SaveArrays(Calibrate ? 'itu_i' : 'itu_i_fixed', citu_i, citu_i_ref, citu_i_err)
		scattern(citu_i_ref, citu_i_err, 'Current (in mA)', 'Error (in %)', 'Current relative error up to ' + CurrentParams.Limit + ' mA')
		
		if(Calibrate)
		{
			var corr = CGEN_GetCorrection2('itu_i')
			CITU_CalI(Channel, corr[0], corr[1], corr[2])
			CITU_PrintCalI(Channel)
		}
	}
}

function CITU_Collect(VoltageValues, MaxCurrent, IterationsCount)
{
	// Подготовительные настройки
	CITU_PrepareMultimeter(MaxCurrent)
	dev.w(132, 10)
	if(dev.r(192) == 0)
		dev.c(1)
	
	if(citu_VoltageMode)
	{
		citu_v = []
		citu_v_ref = []
		citu_v_err = []
	}
	else
	{
		citu_i = []
		citu_i_ref = []
		citu_i_err = []
	}
	
	// Сбор данных
	var cnt = 1
	var total_cnt = VoltageValues.length * IterationsCount
	for(var i = 0; i < IterationsCount; i++)
	{
		for(var j = 0; j < VoltageValues.length; j++)
		{
			var VoltageSet = Math.floor(VoltageValues[j])
			
			p('Test ' + (cnt++) + ' of ' + total_cnt)
			p('Set voltage,   V: ' + VoltageSet)
			
			citu_VReadyTime = undefined
			if(ITU_Start(VoltageSet, MaxCurrent, CITU_TestCallback, true))
			{
				if(citu_VoltageMode)
				{
					var name = ' voltage,  V'
					var idx = citu_v.length - 1
					var unit = citu_v[idx]
					var ref  = citu_v_ref[idx]
					var err  = citu_v_err[idx]
				}
				else
				{
					var name = ' current, mA'
					var idx = citu_i.length - 1
					var unit = citu_i[idx]
					var ref  = citu_i_ref[idx]
					var err  = citu_i_err[idx]
				}
				
				p('Unit' + name + ': ' + unit)
				p('Ref ' + name + ': ' + ref)
				p('Err,           %: ' + err)
				p('----------------------')
			}
			else
				return false
		}
	}
	
	return true
}

function CITU_TestCallback(VoltageReady)
{
	if(VoltageReady && citu_VReadyTime === undefined)
	{
		citu_VReadyTime = Date.now() / 1000
	}
	else if(VoltageReady && (Date.now() / 1000 - citu_VReadyTime) > citu_ProbeTime)
	{
		var unit_result = ITU_ReadResult()
		var ref_result = parseFloat(tmc.q(':READ?')) * 1000
		
		if(citu_VoltageMode)
		{
			citu_v.push(unit_result.v.toFixed(0))
			citu_v_ref.push(ref_result.toFixed(1))
			citu_v_err.push(((unit_result.v - ref_result) / ref_result * 100).toFixed(2))
		}
		else
		{
			if(!compatibility)
			{
				if(Channel == 0)
				unit_result.ix = unit_result.i
				else if(Channel == 1)
				unit_result.ix = unit_result.i2	
				else if(Channel == 2)
				unit_result.ix = unit_result.i3
				else
				unit_result.ix = unit_result.i4	
			}	
			else
				unit_result.ix = unit_result.i

			unit_result.i = unit_result.i2
			citu_i.push(unit_result.ix.toFixed(3))
			citu_i_ref.push(ref_result.toFixed(4))
			citu_i_err.push(((unit_result.ix - ref_result) / ref_result * 100).toFixed(2))
		}
		
		dev.c(101)
	}
}
//
function CITU_PrepareMultimeter(MaxCurrent)
{
	tmc.co()
	tmc.w('*RST')
	if(citu_VoltageMode)
	{
		tmc.w(':FUNC \"VOLT:AC\"')
		tmc.w('VOLT:AC:RANG 10')
	}
	else
	{
		tmc.w(':FUNC \"CURR:AC\"')
		tmc.w('CURR:AC:RANG ' + (MaxCurrent / 1000))
	}
}
//+
function CITU_GetIRangeParameters(Channel)
{
	if(compatibility)
	{
		switch(citu_IRange)
		{
			case 1:
				return {StartReg : 9,  Limit : dev.r(215), P0div : 10}
		
			case 2:
				return {StartReg : 14, Limit : dev.r(216), P0div : 100}
		
			case 3:
				return {StartReg : 19, Limit : dev.r(217), P0div : 1000}
		}
	}	
	else
	{
		switch(citu_IRange)
		{
			case 1:
				return {StartReg : 10 + (12 * Channel),  Limit : dev.rf(75)}
		
			case 2:
				return {StartReg : 14 + (12 * Channel), Limit : dev.rf(74)}
		
			case 3:
				return {StartReg : 18 + (12 * Channel), Limit : dev.rf(73)}
		}		
	}
}
//+
function CITU_CalX(Params, P2, P1, P0)
{
	if(compatibility)
	{	
		dev.ws(Params.StartReg, Math.round(P2 * 1e6))
		dev.w(Params.StartReg + 1, Math.round(P1 * 1000))
		dev.ws(Params.StartReg + 2, Math.round(P0 * Params.P0div))
	}
	else
	{
		dev.wf(Params.StartReg, P2)
		dev.wf(Params.StartReg + 1, P1)
		dev.wf(Params.StartReg + 2, P0)
	}
}	
//+
function CITU_CalV(P2, P1, P0)
{
	if(compatibility)
		CITU_CalX({StartReg : 4, P0div : 10}, P2, P1, P0)
	else
		CITU_CalX({StartReg : 6}, P2, P1, P0)
}
//+
function CITU_CalI(Channel, P2, P1, P0)
{
	var Params = CITU_GetIRangeParameters(Channel)
	if(Params)
		CITU_CalX(Params, P2, P1, P0)
}
//+
function CITU_PrintCalX(Title, Params)
{
	if(compatibility)
	{
		p(Title)
		p('P2 x1e6 : ' + dev.rs(Params.StartReg))
		p('P1 x1000: ' + dev.r(Params.StartReg + 1))
		p('P0 x' + Params.P0div + (Params.P0div == 100 ? ' ' : Params.P0div == 10 ? '  ' : '') +
			': ' + dev.rs(Params.StartReg + 2))
	}
	else
	{
		p(Title)
		p('P2 : ' + dev.rf(Params.StartReg))
		p('P1 : ' + dev.rf(Params.StartReg + 1))
		p('P0 : ' +  dev.rf(Params.StartReg + 2))
	}	
}
//+
function CITU_PrintCalV()
{
	if(compatibility)
		CITU_PrintCalX('Voltage', {StartReg : 4, P0div : 10})
	else
		CITU_PrintCalX('Voltage', {StartReg : 6})
}
//+
function CITU_PrintCalI(Channel)
{
	var Params = CITU_GetIRangeParameters(Channel)
	if(Params)
		CITU_PrintCalX('Current range ' + citu_IRange +
			' up to ' + Params.Limit + ' mA ' + (Channel + 1) + ' Channel' , Params)
}
