include("PrintStatus.js")

// Совместимость: 0 - версия 1.0.0, 1 - версия 1.0
compatibility = 0

function ITU_Start(Voltage, Current, VReadyCallback, MutePrint)
{
	dev.w(128, Voltage)
	if(compatibility)
	{
		dev.w(129, Math.floor(Current))
		dev.w(130, Math.floor(Current % 1 * 1000))
	}
	else
		dev.wf(129,Current)
	dev.c(100)
	var start_time = Date.now() / 1000
	var time_div = 0
	if(!MutePrint)
		p('Start:  ' + (new Date()).toLocaleTimeString())
	
	while(dev.r(192) == 4)
	{
		if(typeof(VReadyCallback) == 'function')
			VReadyCallback(dev.r(198) == 1)
		
		if(anykey())
		{
			dev.c(101)
			return false
		}
		
		if(!MutePrint)
		{
			var new_div = Math.floor((Date.now() / 1000 - start_time) / 10)
			if(new_div != time_div)
			{
				time_div = new_div
				p('Point:  ' + (new Date()).toLocaleTimeString() + ', V: ' + dev.r(200) +
					', I: ' + (dev.r(201) + dev.r(202) / 1000).toFixed(3))
			}
		}
		
		sleep(100)
	}
	if(!MutePrint)
		p('Finish: ' + (new Date()).toLocaleTimeString())
	
	if(dev.r(192) == 3)
	{
		if(!MutePrint)
		{
			var res = ITU_ReadResult()
			
			p('Voltage,      V: ' + res.v.toFixed(0))
			p('Current,     mA: ' + res.i.toFixed(3))
			if(!compatibility)
			{
				p('Current2,     mA: ' + res.i2.toFixed(3))
				p('Current3,     mA: ' + res.i3.toFixed(3))
				p('Current4,     mA: ' + res.i4.toFixed(3))	
			}
			p('Current act, mA: ' + res.i_act.toFixed(3))
			if(!compatibility)
			{
				p('Current2 act, mA: ' + res.i2_act.toFixed(3))
				p('Current3 act, mA: ' + res.i3_act.toFixed(3))
				p('Current4 act, mA: ' + res.i4_act.toFixed(3))
			}	
			p('Cos Phi        : ' + res.cos_phi.toFixed(3))
			if(!compatibility)
			{
				p('Cos Phi2        : ' + res.cos_phi2.toFixed(3))
				p('Cos Phi3        : ' + res.cos_phi3.toFixed(3))
				p('Cos Phi4        : ' + res.cos_phi4.toFixed(3))
			}	
			if(dev.r(195) == 1)
				p('Output current saturation')
		}
		
		return true
	}
	else
	{
		PrintStatus()
		return false
	}
}

function ITU_Cycle(Count, Voltage, Current, Sleep)
{
	if(typeof citu_Count == 'undefined')
		citu_Count = 0
	
	for(var i = 0; i < Count; i++)
	{
		p('Test #' + (citu_Count++ + 1))
		if(ITU_Start(Voltage, Current))
		{
			p('-----')
			sleep(Sleep ? Sleep : 1000)
		}
		else
		{
			p('Stopped')
			return
		}
	}
}

function ITU_ReadResult()
{
	var voltage 	= dev.rf(200)
	
	if(compatibility)
	{
		var current 	= dev.r(201) + dev.r(202) / 1000
		var current_act = dev.r(203) + dev.r(204) / 1000
		var cos_phi		= dev.rs(205) / 1000
	}
	else
	{	
		var current 	= dev.rf(201)
		var current2 	= dev.rf(204)
		var current3 	= dev.rf(207)
		var current4 	= dev.rf(210)	
	
		var current_act  = dev.rf(202)
		var current2_act = dev.rf(205)
		var current3_act = dev.rf(208)
		var current4_act = dev.rf(211)
	
		var cos_phi		= dev.rf(203)
		var cos_phi2	= dev.rf(206)
		var cos_phi3	= dev.rf(209)
		var cos_phi4	= dev.rf(212)
	}	
	if(compatibility)
		return {v : voltage, i : current, i_act : current_act, cos_phi : cos_phi}
	else
		return {v : voltage, i : current, i2 : current2, i3 : current3, i4 :current4, i_act : current_act, i2_act : current2_act, i3_act : current3_act, 
	i4_act : current4_act, cos_phi : cos_phi, cos_phi2 : cos_phi2, cos_phi3 : cos_phi3, cos_phi4 : cos_phi4}
}

function ITU_PlotFull()
{
	var a = ITU_Read()
	var res = {v : a[1], i_ : [], vrms : a[4], irms : [], pwm : a[7], cosphi : []}
	for(var i = 0; i < a[1].length; i++)
	{
		res.i_.push(a[2][i] + a[3][i] / 1000)
		res.irms.push(a[5][i] + a[6][i] / 1000)
		res.cosphi[i] = a[8][i] / 1000
	}
	
	var scale = dev.r(133)
	var time_scale = 50e-6 * (scale == 0 ? 1 : scale)
	plot(res.pwm, time_scale, 0)
	plot(res.cosphi, time_scale, 0)
	plot2(res.vrms, res.irms, time_scale, 0)
	plot2(res.v, res.i_, time_scale, 0)
	
	return res
}

function ITU_PlotFast()
{
	var i_mA = dev.rafs(2)
	var i_uA = dev.rafs(3)
	var irms_mA = dev.rafs(5)
	var irms_uA = dev.rafs(6)
	var cosphi = dev.rafs(8)
	
	var i_ = [], irms = []
	for(var i = 0; i < i_mA.length; i++)
	{
		i_.push(i_mA[i] + i_uA[i] / 1000)
		irms.push(irms_mA[i] + irms_uA[i] / 1000)
		cosphi[i] /= 1000
	}
	
	var scale = dev.r(133)
	var time_scale = 50e-6 * (scale == 0 ? 1 : scale)
	plot(dev.rafs(7), time_scale, 0)
	plot(cosphi, time_scale, 0)
	plot2(dev.rafs(4), irms, time_scale, 0)
	plot2(dev.rafs(1), i_, time_scale, 0)
}

function ITU_PlotSaved(Prefix)
{
	var res = {}
	res.v =			load(Prefix + '_v.txt')
	res.i_ =		load(Prefix + '_i.txt')
	res.vrms =		load(Prefix + '_vrms.txt')
	res.irms = 		load(Prefix + '_irms.txt')
	res.pwm = 		load(Prefix + '_pwm.txt')
	res.cosphi = 	load(Prefix + '_cosphi.txt')
	
	var time_scale = 50e-6
	plot(res.pwm, time_scale, 0);				sleep(200)
	plot(res.cosphi, time_scale, 0);			sleep(200)
	plot2(res.vrms, res.irms, time_scale, 0);	sleep(200)
	plot2(res.v, res.i_, time_scale, 0)
	
	return res
}

function ITU_TestOptics()
{
	var cnt = 0
	while(!anykey())
	{
		cnt++
		dev.c(11)
		dev.c(10)
		if(dev.r(230) == 0)
		{
			p(dev.r(231) + ', ' + dev.r(232) + ', ' + dev.r(233))
			p('count: ' + cnt)
			return
		}
	}
	
	p('count: ' + cnt)
}

function ITU_PrintDiag()
{
	for(var i = 0; i < 4; i++)
	{
		var reg_num = 230 + i
		p(reg_num + ': ' + dev.r(230 + i))
	}
}

function ITU_Read()
{
	var res = []
	for(var i = 1; i <= 8; i++)
		res[i] = []
	
	while(true)
	{
		dev.c(110);
		for(var i = 1; i <= 8; i++)
		{
			var data = dev.rafs(i)
			res[i] = res[i].concat(data)
		}
		
		if(data.length == 0)
			break
	}
	
	return res
}

function ITU_CalibrateRawOffset()
{
	var cnt = 1000, voltage = 0, current = 0
	for(var i = 0; i < cnt; i++)
	{
		dev.c(12)
		dev.c(10)
		if(dev.r(230) == 1)
		{
			voltage += dev.r(232)
			current += dev.r(233)
		}
		else
		{
			p('Optical interface error')
			return
		}
	}
	
	voltage = Math.floor(voltage / cnt)
	current = Math.floor(current / cnt)
	
	p('Voltage offset: ' + voltage)
	p('Current offset: ' + current)
	
	dev.w(0, voltage)
	dev.w(1, current)
}

function ITU_Save(Result, Prefix)
{
	if (typeof Prefix === 'undefined')
		Prefix = ''
	else
		Prefix = '_' + Prefix
	
	save(Prefix + '_v.txt', Result.v)
	save(Prefix + '_i.txt', Result.i_)
	save(Prefix + '_vrms.txt', Result.vrms)
	save(Prefix + '_irms.txt', Result.irms)
	save(Prefix + '_pwm.txt', Result.pwm)
	save(Prefix + '_cosphi.txt', Result.cosphi)
}
